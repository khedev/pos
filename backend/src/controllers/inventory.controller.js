import { supabaseAdmin } from '../config/supabase.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const getItems = async (req, res, next) => {
  try {
    const {
      search, category, supplier, stock_status, expiration_status,
      page = 1, limit = 20,
    } = req.query;
    let query = supabaseAdmin
      .from('products')
      .select('*, categories(name), suppliers(name)', { count: 'exact' })
      .eq('is_active', true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (supplier) {
      query = query.eq('supplier_id', supplier);
    }
    if (stock_status === 'low') {
      query = query.gt('min_stock', 0).lte('current_stock', supabaseAdmin.raw('min_stock'));
    } else if (stock_status === 'out') {
      query = query.lte('current_stock', 0);
    } else if (stock_status === 'in') {
      query = query.gt('current_stock', 0);
    }
    if (expiration_status === 'expiring') {
      // Products with batches expiring within 30 days
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      query = query.not('id', 'in', supabaseAdmin
        .from('product_batches')
        .select('product_id')
        .gt('expiration_date', thirtyDays.toISOString())
      );
    } else if (expiration_status === 'expired') {
      query = query.not('id', 'in', supabaseAdmin
        .from('product_batches')
        .select('product_id')
        .gt('expiration_date', new Date().toISOString())
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('name')
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

export const getItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, categories(*), suppliers(*), product_batches(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Product not found' });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  try {
    const {
      barcode, sku, name, generic_name, brand, category_id,
      supplier_id, unit, cost_price, selling_price, current_stock,
      min_stock, max_stock, image_url,
    } = req.body;

    // Convert empty strings to null for UUID/UNIQUE columns
    const cleanVal = (v) => (v === '' || v == null ? null : v);

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        barcode: cleanVal(barcode),
        sku: cleanVal(sku),
        name,
        generic_name: cleanVal(generic_name),
        brand: cleanVal(brand),
        category_id: cleanVal(category_id),
        supplier_id: cleanVal(supplier_id),
        unit,
        cost_price,
        selling_price,
        current_stock: current_stock || 0,
        min_stock: min_stock || 0,
        max_stock: cleanVal(max_stock),
        image_url: cleanVal(image_url),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE',
      entity: 'products',
      entity_id: data.id,
      details: { name: data.name },
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'products',
      entity_id: id,
      details: updates,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DELETE',
      entity: 'products',
      entity_id: id,
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ARCHIVE PRODUCT
// ============================================================
export const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ARCHIVE',
      entity: 'products',
      entity_id: id,
      details: { name: data.name },
    });

    res.json({ message: 'Product archived successfully', product: data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// IMPORT EXCEL
// ============================================================
export const importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const results = { success: 0, errors: [] };

    // Skip header row (row 1)
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const barcode = row.getCell(1).value?.toString() || null;
      const sku = row.getCell(2).value?.toString() || null;
      const name = row.getCell(3)?.value?.toString();
      const generic_name = row.getCell(4)?.value?.toString() || null;
      const brand = row.getCell(5)?.value?.toString() || null;
      const category_name = row.getCell(6)?.value?.toString() || null;
      const supplier_name = row.getCell(7)?.value?.toString() || null;
      const unit = row.getCell(8)?.value?.toString() || 'piece';
      const cost_price = parseFloat(row.getCell(9)?.value) || 0;
      const selling_price = parseFloat(row.getCell(10)?.value) || 0;
      const current_stock = parseFloat(row.getCell(11)?.value) || 0;
      const min_stock = parseFloat(row.getCell(12)?.value) || 0;

      if (!name) {
        results.errors.push({ row: i, message: 'Product name is required' });
        continue;
      }

      // Resolve category
      let category_id = null;
      if (category_name) {
        const { data: cat } = await supabaseAdmin
          .from('categories')
          .select('id')
          .ilike('name', category_name)
          .maybeSingle();
        category_id = cat?.id || null;
      }

      // Resolve supplier
      let supplier_id = null;
      if (supplier_name) {
        const { data: sup } = await supabaseAdmin
          .from('suppliers')
          .select('id')
          .ilike('name', supplier_name)
          .maybeSingle();
        supplier_id = sup?.id || null;
      }

      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          barcode, sku, name, generic_name, brand,
          category_id, supplier_id, unit,
          cost_price, selling_price,
          current_stock, min_stock,
          is_active: true,
        });

      if (error) {
        results.errors.push({ row: i, message: error.message });
      } else {
        results.success++;
      }
    }

    res.json({
      message: `Imported ${results.success} products with ${results.errors.length} errors`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORT EXCEL
// ============================================================
export const exportExcel = async (req, res, next) => {
  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Generic Name', key: 'generic_name', width: 25 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost Price', key: 'cost_price', width: 12 },
      { header: 'Selling Price', key: 'selling_price', width: 12 },
      { header: 'Current Stock', key: 'current_stock', width: 12 },
      { header: 'Min Stock', key: 'min_stock', width: 10 },
    ];

    products.forEach((product) => {
      worksheet.addRow({
        barcode: product.barcode,
        sku: product.sku,
        name: product.name,
        generic_name: product.generic_name,
        brand: product.brand,
        category: product.categories?.name || '',
        supplier: product.suppliers?.name || '',
        unit: product.unit,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORT PDF
// ============================================================
export const exportPdf = async (req, res, next) => {
  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.pdf`);

    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Product List', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    // Table headers
    const tableTop = doc.y;
    const colWidths = [20, 50, 90, 60, 60, 50];
    const headers = ['#', 'Barcode', 'Name', 'Category', 'Price', 'Stock'];

    doc.font('Helvetica-Bold').fontSize(8);
    let xPos = 30;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveDown(0.5);
    let rowY = doc.y;

    doc.font('Helvetica').fontSize(7);
    products.forEach((product, index) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 30;
      }

      xPos = 30;
      const rowData = [
        (index + 1).toString(),
        product.barcode || '',
        product.name,
        product.categories?.name || '',
        `₱${product.selling_price?.toFixed(2) || '0.00'}`,
        product.current_stock?.toString() || '0',
      ];

      rowData.forEach((text, i) => {
        doc.text(text, xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      rowY += 14;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// ============================================================
// IMAGE UPLOAD
// ============================================================
export const uploadImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'products',
      entity_id: id,
      details: { image_uploaded: true },
    });

    res.json({ message: 'Image uploaded successfully', product: data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE IMAGE
// ============================================================
export const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'products',
      entity_id: id,
      details: { image_deleted: true },
    });

    res.json({ message: 'Image deleted successfully', product: data });
  } catch (error) {
    next(error);
  }
};