/**
 * Receiving Controller - Complete receiving workflow
 */
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { generateReceivingNumber, paginate, buildDateFilter } from '../utils/helpers.js';
import PDFDocument from 'pdfkit';

/**
 * Get paginated, filterable receiving list
 */
export const getReceivings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, supplier_id, startDate, endDate } = req.query;
    const { from, to } = paginate(page, limit);

    let query = supabase
      .from('receiving')
      .select('*, suppliers(name), users!receiving_received_by_fkey(name)', { count: 'exact' });

    query = buildDateFilter(query, 'created_at', startDate, endDate);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (search) query = query.or(`receiving_number.ilike.%${search}%,invoice_number.ilike.%${search}%`);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      items: data || [],
      total: count || 0,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single receiving with items
 */
export const getReceiving = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: receiving, error } = await supabase
      .from('receiving')
      .select('*, suppliers(*), users!receiving_received_by_fkey(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!receiving) return res.status(404).json({ message: 'Receiving not found' });

    const { data: items } = await supabase
      .from('receiving_items')
      .select('*, products(id, name, sku, barcode, unit)')
      .eq('receiving_id', id);

    res.json({ ...receiving, items: items || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * Create receiving record
 */
export const createReceiving = async (req, res, next) => {
  try {
    const { invoice_number, supplier_id, notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Calculate total cost
    let totalCost = 0;
    for (const item of items) {
      totalCost += item.quantity * item.cost_price;
    }

    // Generate receiving number
    const receivingNumber = generateReceivingNumber();

    // Create receiving record
    const { data: receiving, error: receivingError } = await supabase
      .from('receiving')
      .insert({
        receiving_number: receivingNumber,
        invoice_number: invoice_number || null,
        supplier_id: supplier_id || null,
        received_by: req.user.id,
        notes: notes || null,
        total_cost: totalCost,
      })
      .select()
      .single();

    if (receivingError) throw receivingError;

    // Process each item
    for (const item of items) {
      // Insert receiving item
      const { error: itemError } = await supabase.from('receiving_items').insert({
        receiving_id: receiving.id,
        product_id: item.product_id,
        batch_number: item.batch_number || null,
        quantity: item.quantity,
        cost_price: item.cost_price,
        expiration_date: item.expiration_date || null,
      });

      if (itemError) throw itemError;

      // Update product stock
      const { error: stockError } = await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      if (stockError) throw stockError;

      // Update average cost
      const { data: product } = await supabase
        .from('products')
        .select('cost_price, current_stock')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const currentStock = Number(product.current_stock) || 0;
        const currentCost = Number(product.cost_price) || 0;
        const newStock = currentStock + item.quantity;

        // Weighted average cost
        const newAvgCost = ((currentCost * currentStock) + (item.cost_price * item.quantity)) / newStock;

        await supabase
          .from('products')
          .update({ cost_price: newAvgCost })
          .eq('id', item.product_id);
      }

      // Create or update product batch
      if (item.batch_number) {
        const { data: existingBatch } = await supabase
          .from('product_batches')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .eq('batch_number', item.batch_number)
          .maybeSingle();

        if (existingBatch) {
          // Update existing batch
          await supabase
            .from('product_batches')
            .update({
              quantity: Number(existingBatch.quantity) + item.quantity,
              cost_price: item.cost_price,
              expiration_date: item.expiration_date || existingBatch.expiration_date,
            })
            .eq('id', existingBatch.id);
        } else {
          // Create new batch
          await supabase.from('product_batches').insert({
            product_id: item.product_id,
            batch_number: item.batch_number,
            quantity: item.quantity,
            cost_price: item.cost_price,
            expiration_date: item.expiration_date || null,
            received_date: new Date().toISOString(),
          });
        }
      }

      // Create inventory log
      await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        type: 'IN',
        quantity: item.quantity,
        reference: receivingNumber,
        notes: `Receiving: ${item.batch_number || 'N/A'}`,
        created_by: req.user.id,
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'RECEIVING',
      entity: 'receiving',
      entity_id: receiving.id,
      details: { receiving_number: receivingNumber, total_cost: totalCost, items: items.length },
    });

    res.status(201).json({
      ...receiving,
      items_count: items.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update receiving record
 */
export const updateReceiving = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { invoice_number, notes, items } = req.body;

    // Get existing receiving
    const { data: existing } = await supabase
      .from('receiving')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ message: 'Receiving not found' });

    // Update receiving header
    const updates = {};
    if (invoice_number !== undefined) updates.invoice_number = invoice_number;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('receiving')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
    }

    // If items provided, replace existing items
    if (items && items.length > 0) {
      // Get old items for audit
      const { data: oldItems } = await supabase
        .from('receiving_items')
        .select('*')
        .eq('receiving_id', id);

      // Reverse old items from stock
      for (const oldItem of oldItems || []) {
        await supabase.rpc('decrement_stock', {
          p_product_id: oldItem.product_id,
          p_quantity: oldItem.quantity,
        });
      }

      // Delete old items
      await supabase.from('receiving_items').delete().eq('receiving_id', id);

      // Calculate new total cost
      let totalCost = 0;

      // Insert new items and update stock
      for (const item of items) {
        totalCost += item.quantity * item.cost_price;

        await supabase.from('receiving_items').insert({
          receiving_id: id,
          product_id: item.product_id,
          batch_number: item.batch_number || null,
          quantity: item.quantity,
          cost_price: item.cost_price,
          expiration_date: item.expiration_date || null,
        });

        await supabase.rpc('increment_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }

      // Update total cost
      await supabase
        .from('receiving')
        .update({ total_cost: totalCost })
        .eq('id', id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'receiving',
      entity_id: id,
    });

    res.json({ message: 'Receiving updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Print receiving slip as PDF
 */
export const printReceiving = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: receiving } = await supabase
      .from('receiving')
      .select('*, suppliers(*), users!receiving_received_by_fkey(name)')
      .eq('id', id)
      .single();

    if (!receiving) return res.status(404).json({ message: 'Receiving not found' });

    const { data: items } = await supabase
      .from('receiving_items')
      .select('*, products(name, sku, unit)')
      .eq('receiving_id', id);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=receiving_${receiving.receiving_number}.pdf`);
      res.send(pdfData);
    });

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('RECEIVING SLIP', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Receiving #: ${receiving.receiving_number}`);
    doc.text(`Date: ${new Date(receiving.created_at).toLocaleString()}`);
    doc.text(`Supplier: ${receiving.suppliers?.name || 'N/A'}`);
    doc.text(`Invoice #: ${receiving.invoice_number || 'N/A'}`);
    doc.text(`Received by: ${receiving.users?.name || 'N/A'}`);

    if (receiving.notes) {
      doc.text(`Notes: ${receiving.notes}`);
    }

    doc.moveDown(0.5);
    doc.text('='.repeat(80));

    // Table headers
    const tableTop = doc.y;
    const colWidths = [30, 60, 120, 60, 60, 60];
    const headers = ['#', 'SKU', 'Product Name', 'Batch #', 'Qty', 'Cost'];

    doc.font('Helvetica-Bold').fontSize(8);
    let xPos = 30;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveDown(0.3);
    let rowY = doc.y;
    doc.font('Helvetica').fontSize(8);

    (items || []).forEach((item, index) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 30;
      }

      xPos = 30;
      const rowData = [
        (index + 1).toString(),
        item.products?.sku || '',
        (item.products?.name || '').substring(0, 25),
        item.batch_number || '',
        item.quantity.toString(),
        `₱${Number(item.cost_price).toFixed(2)}`,
      ];

      rowData.forEach((text, i) => {
        doc.text(text, xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      rowY += 14;
    });

    doc.moveDown(0.5);
    doc.text('-'.repeat(80));
    doc.font('Helvetica-Bold');
    doc.text(`Total Cost: ₱${Number(receiving.total_cost).toFixed(2)}`, { align: 'right' });

    doc.end();
  } catch (error) {
    next(error);
  }
};