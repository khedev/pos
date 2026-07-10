/**
 * Sales/POS Controller - Complete cashier workflow
 */
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { generateReceiptNumber, paginate, buildDateFilter } from '../utils/helpers.js';
import PDFDocument from 'pdfkit';

/**
 * Get paginated, filterable sales list
 */
export const getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, payment_method, status, cashier_id } = req.query;
    const { from, to } = paginate(page, limit);

    let query = supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name, email)', { count: 'exact' });

    query = buildDateFilter(query, 'created_at', startDate, endDate);
    if (payment_method) query = query.eq('payment_method', payment_method);
    if (status) query = query.eq('status', status);
    if (cashier_id) query = query.eq('cashier_id', cashier_id);

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
 * Get single sale with full details
 */
export const getSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: sale, error } = await supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name, email), users!sales_voided_by_fkey(name, email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Get sale items
    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name, sku, barcode)')
      .eq('sale_id', id);

    // Get payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('sale_id', id);

    // Get void info
    const { data: voidInfo } = await supabase
      .from('void_transactions')
      .select('*')
      .eq('sale_id', id)
      .single();

    res.json({
      ...sale,
      items: items || [],
      payments: payments || [],
      void_info: voidInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create sale (checkout)
 */
export const createSale = async (req, res, next) => {
  try {
    const { items, payment_method, payment_amount, discount_type, discount_amount, senior_id } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate stock and check expiration dates
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, current_stock, selling_price, cost_price')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(404).json({ message: `Product ${item.product_id} not found` });
      }

      if (Number(product.current_stock) < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.current_stock}, Requested: ${item.quantity}`,
        });
      }

      // Check for expired batches (FEFO - First Expired, First Out)
      if (item.batch_id) {
        const { data: batch } = await supabase
          .from('product_batches')
          .select('id, quantity, expiration_date')
          .eq('id', item.batch_id)
          .single();

        if (batch && batch.expiration_date) {
          const expDate = new Date(batch.expiration_date);
          if (expDate < new Date()) {
            return res.status(400).json({ message: `Cannot sell expired batch for ${product.name}` });
          }
        }
      }
    }

    // Calculate totals
    let subtotal = 0;
    const saleItemsData = [];

    for (const item of items) {
      const price = item.price || 0;
      const cost = item.cost || 0;
      const itemSubtotal = item.quantity * price;
      const itemDiscount = item.discount || 0;
      subtotal += itemSubtotal - itemDiscount;

      saleItemsData.push({
        product_id: item.product_id,
        batch_id: item.batch_id || null,
        quantity: item.quantity,
        price,
        cost,
        discount: itemDiscount,
        subtotal: itemSubtotal - itemDiscount,
      });
    }

    const vatRate = 0.12;
    const taxableAmount = subtotal / (1 + vatRate);
    const vat = subtotal - taxableAmount;
    const discount = discount_amount || 0;
    const total = subtotal - discount;
    const changeAmount = payment_amount ? payment_amount - total : 0;

    // Generate receipt number
    const receiptNumber = generateReceiptNumber();

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        receipt_number: receiptNumber,
        cashier_id: req.user.id,
        subtotal,
        vat,
        discount_type: discount_type || 'none',
        discount_amount: discount,
        total,
        payment_method,
        payment_amount: payment_amount || total,
        change_amount: Math.max(0, changeAmount),
        status: 'completed',
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items and update stock
    for (const item of saleItemsData) {
      // Insert sale item
      const { error: itemError } = await supabase.from('sale_items').insert({
        sale_id: sale.id,
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
        discount: item.discount,
        subtotal: item.subtotal,
      });

      if (itemError) throw itemError;

      // Decrement stock
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      if (stockError) throw stockError;

      // Update batch quantity if using batch
      if (item.batch_id) {
        const { error: batchError } = await supabase
          .from('product_batches')
          .update({ quantity: supabase.raw(`quantity - ${item.quantity}`) })
          .eq('id', item.batch_id);

        if (batchError) console.error('Batch update error:', batchError);
      }

      // Create inventory log
      const { error: logError } = await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        batch_id: item.batch_id,
        type: 'OUT',
        quantity: item.quantity,
        reference: receiptNumber,
        notes: 'Sale',
        created_by: req.user.id,
      });

      if (logError) console.error('Inventory log error:', logError);
    }

    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert({
      sale_id: sale.id,
      payment_method,
      amount: payment_amount || total,
      reference: null,
    });

    if (paymentError) console.error('Payment record error:', paymentError);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'SALE',
      entity: 'sales',
      entity_id: sale.id,
      details: { receipt: receiptNumber, total, items: items.length },
    });

    res.status(201).json({
      ...sale,
      change_amount: Math.max(0, changeAmount),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Void a sale (Admin only)
 */
export const voidSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Void reason is required' });
    }

    // Get sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single();

    if (saleError) throw saleError;
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.status === 'voided') {
      return res.status(400).json({ message: 'Sale is already voided' });
    }

    // Update sale status
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_by: req.user.id,
        void_reason: reason,
        voided_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Restore stock
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', id);

    for (const item of saleItems || []) {
      // Restore stock
      await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      // Restore batch quantity
      if (item.batch_id) {
        await supabase
          .from('product_batches')
          .update({ quantity: supabase.raw(`quantity + ${item.quantity}`) })
          .eq('id', item.batch_id);
      }

      // Create inventory log
      await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        batch_id: item.batch_id,
        type: 'IN',
        quantity: item.quantity,
        reference: sale.receipt_number,
        notes: 'Void',
        created_by: req.user.id,
      });
    }

    // Create void record
    await supabase.from('void_transactions').insert({
      sale_id: id,
      voided_by: req.user.id,
      reason,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'VOID',
      entity: 'sales',
      entity_id: id,
      details: { receipt: sale.receipt_number, reason },
    });

    res.json({ message: 'Sale voided successfully', sale_id: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Get receipt data for printing
 */
export const getReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: sale, error } = await supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!sale) return res.status(404).json({ message: 'Receipt not found' });

    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name)')
      .eq('sale_id', id);

    res.json({ sale, items: items || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * Print receipt as PDF
 */
export const printReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: sale } = await supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name)')
      .eq('id', id)
      .single();

    if (!sale) return res.status(404).json({ message: 'Receipt not found' });

    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name, sku)')
      .eq('sale_id', id);

    // Get company settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['company_name', 'company_address', 'company_contact', 'receipt_header', 'receipt_footer']);

    const settingsMap = {};
    (settings || []).forEach(s => { settingsMap[s.key] = s.value; });

    const doc = new PDFDocument({ size: [80 * 2.835, 600], margin: 10 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=receipt_${sale.receipt_number}.pdf`);
      res.send(pdfData);
    });

    // Receipt content
    const companyName = settingsMap?.company_name || 'PGPOS Store';
    const companyAddress = settingsMap?.company_address || '';
    const companyContact = settingsMap?.company_contact || '';
    const receiptHeader = settingsMap?.receipt_header || '';
    const receiptFooter = settingsMap?.receipt_footer || 'Thank you for your purchase!';

    doc.fontSize(10).font('Helvetica-Bold').text(companyName, { align: 'center' });
    if (companyAddress) doc.fontSize(7).font('Helvetica').text(companyAddress, { align: 'center' });
    if (companyContact) doc.fontSize(7).text(companyContact, { align: 'center' });
    if (receiptHeader) doc.fontSize(7).text(receiptHeader, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(6).font('Helvetica');
    doc.text('='.repeat(42), { align: 'center' });

    doc.fontSize(7);
    doc.text(`Receipt: ${sale.receipt_number}`);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`);
    doc.text(`Cashier: ${sale.users?.name || 'N/A'}`);
    doc.text(`Payment: ${sale.payment_method?.toUpperCase()}`);

    doc.moveDown(0.3);
    doc.text('='.repeat(42), { align: 'center' });
    doc.text('Item                    Qty    Price');
    doc.text('-'.repeat(42));

    (items || []).forEach(item => {
      const name = (item.products?.name || 'Item').substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(4);
      const price = `₱${Number(item.price).toFixed(2)}`.padStart(8);
      doc.text(`${name}${qty}${price}`);
      if (item.discount > 0) {
        doc.text(`  Discount: -₱${Number(item.discount).toFixed(2)}`.padStart(42));
      }
    });

    doc.text('-'.repeat(42));
    doc.font('Helvetica-Bold');
    doc.text(`Subtotal:`.padEnd(34) + `₱${Number(sale.subtotal).toFixed(2)}`.padStart(8));
    doc.font('Helvetica');
    doc.text(`VAT (12%):`.padEnd(34) + `₱${Number(sale.vat).toFixed(2)}`.padStart(8));
    if (sale.discount_amount > 0) {
      doc.text(`Discount:`.padEnd(34) + `-₱${Number(sale.discount_amount).toFixed(2)}`.padStart(8));
    }
    doc.font('Helvetica-Bold');
    doc.text(`TOTAL:`.padEnd(34) + `₱${Number(sale.total).toFixed(2)}`.padStart(8));
    doc.font('Helvetica');
    doc.text(`Cash:`.padEnd(34) + `₱${Number(sale.payment_amount).toFixed(2)}`.padStart(8));
    doc.text(`Change:`.padEnd(34) + `₱${Number(sale.change_amount).toFixed(2)}`.padStart(8));

    doc.moveDown(0.5);
    doc.text('='.repeat(42), { align: 'center' });

    if (receiptFooter) {
      doc.fontSize(7).text(receiptFooter, { align: 'center' });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};