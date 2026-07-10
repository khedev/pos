/**
 * Reports Controller - Complete reporting with PDF and Excel export
 */
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { paginate, buildDateFilter, getDateRange } from '../utils/helpers.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

/**
 * Get sales report with summary
 */
export const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;
    const range = getDateRange(period);
    const sDate = startDate || range.startDate;
    const eDate = endDate || range.endDate;

    let query = supabase
      .from('sales')
      .select('created_at, total, subtotal, vat, discount_amount, payment_method, status, receipt_number');

    query = buildDateFilter(query, 'created_at', sDate, eDate);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const completed = (data || []).filter(s => s.status === 'completed');
    const totalSales = completed.reduce((sum, s) => sum + Number(s.total), 0);
    const totalVat = completed.reduce((sum, s) => sum + Number(s.vat), 0);
    const totalDiscounts = completed.reduce((sum, s) => sum + Number(s.discount_amount), 0);
    const totalTransactions = completed.length;

    // Payment method breakdown
    const paymentBreakdown = {};
    completed.forEach(s => {
      const method = s.payment_method || 'unknown';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { method, total: 0, count: 0 };
      paymentBreakdown[method].total += Number(s.total);
      paymentBreakdown[method].count++;
    });

    res.json({
      data: completed,
      summary: {
        totalSales,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
        totalVat,
        totalDiscounts,
        paymentBreakdown: Object.values(paymentBreakdown),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get item sales report
 */
export const getItemSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('sale_items')
      .select(`
        quantity, price, cost, subtotal, discount,
        products(name, sku, barcode, category_id, categories(name)),
        sales!inner(created_at, status)
      `);

    query = buildDateFilter(query, 'sales.created_at', startDate, endDate);
    query = query.eq('sales.status', 'completed');

    const { data, error } = await query.order('quantity', { ascending: false });

    if (error) throw error;

    // Aggregate by product
    const productMap = {};
    (data || []).forEach(item => {
      const pid = item.products?.sku || item.products?.name || 'unknown';
      if (!productMap[pid]) {
        productMap[pid] = {
          name: item.products?.name || 'Unknown',
          sku: item.products?.sku || '',
          barcode: item.products?.barcode || '',
          category: item.products?.categories?.name || 'N/A',
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          discount: 0,
        };
      }
      productMap[pid].quantity += item.quantity;
      productMap[pid].revenue += Number(item.subtotal);
      productMap[pid].cost += Number(item.cost || 0);
      productMap[pid].discount += Number(item.discount || 0);
      productMap[pid].profit = productMap[pid].revenue - productMap[pid].cost;
    });

    const items = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);

    const summary = {
      totalItemsSold: items.reduce((sum, i) => sum + i.quantity, 0),
      totalRevenue: items.reduce((sum, i) => sum + i.revenue, 0),
      totalCost: items.reduce((sum, i) => sum + i.cost, 0),
      totalProfit: items.reduce((sum, i) => sum + i.profit, 0),
      totalDiscounts: items.reduce((sum, i) => sum + i.discount, 0),
    };

    // Best sellers (top 10)
    const bestSellers = items.slice(0, 10);

    // Slow moving (bottom 10 with stock)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, current_stock')
      .eq('is_active', true);

    const productSales = {};
    (data || []).forEach(item => {
      const pid = item.products?.sku || item.products?.name;
      productSales[pid] = (productSales[pid] || 0) + item.quantity;
    });

    const slowMoving = (products || [])
      .filter(p => Number(p.current_stock) > 0)
      .map(p => ({
        name: p.name,
        stock: p.current_stock,
        sold: productSales[p.name] || 0,
      }))
      .filter(p => p.sold < 5)
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10);

    res.json({ items, bestSellers, slowMoving, summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory report
 */
export const getInventoryReport = async (req, res, next) => {
  try {
    const { filter } = req.query;

    let query = supabase
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .eq('is_active', true);

    if (filter === 'low-stock') {
      query = query.gt('min_stock', 0).lte('current_stock', 'min_stock');
    } else if (filter === 'out-of-stock') {
      query = query.eq('current_stock', 0);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;

    // Expiring products
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const { data: expiring } = await supabase
      .from('product_batches')
      .select('*, products(name, sku)')
      .lte('expiration_date', thirtyDays.toISOString())
      .gt('expiration_date', now.toISOString())
      .gt('quantity', 0)
      .order('expiration_date');

    const items = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.categories?.name || 'N/A',
      supplier: p.suppliers?.name || 'N/A',
      unit: p.unit,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      current_stock: p.current_stock,
      min_stock: p.min_stock,
      stock_value: Number(p.current_stock) * Number(p.cost_price || 0),
      is_low_stock: p.min_stock > 0 && Number(p.current_stock) <= Number(p.min_stock),
      is_out_of_stock: Number(p.current_stock) <= 0,
    }));

    const summary = {
      totalItems: items.length,
      totalStockValue: items.reduce((sum, i) => sum + i.stock_value, 0),
      lowStockItems: items.filter(i => i.is_low_stock).length,
      outOfStockItems: items.filter(i => i.is_out_of_stock).length,
      expiringItems: (expiring || []).length,
    };

    res.json({ items, expiring: expiring || [], summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Get receiving report
 */
export const getReceivingReport = async (req, res, next) => {
  try {
    const { startDate, endDate, supplier_id } = req.query;

    let query = supabase
      .from('receiving')
      .select('*, suppliers(name), users!receiving_received_by_fkey(name)');

    query = buildDateFilter(query, 'created_at', startDate, endDate);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const summary = {
      totalReceiving: data?.length || 0,
      totalCost: data?.reduce((sum, r) => sum + Number(r.total_cost), 0) || 0,
      averageCost: data?.length > 0
        ? (data.reduce((sum, r) => sum + Number(r.total_cost), 0) / data.length)
        : 0,
    };

    res.json({ data: data || [], summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Export sales report as PDF
 */
export const exportSalesPdf = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name)')
      .eq('status', 'completed');

    query = buildDateFilter(query, 'created_at', startDate, endDate);

    const { data: sales } = await query.order('created_at', { ascending: false });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sales_report_${Date.now()}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(18).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (startDate && endDate) {
      doc.fontSize(9).text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
    }
    doc.moveDown();

    const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.total), 0);
    doc.fontSize(12).font('Helvetica-Bold').text(`Total Sales: ₱${totalSales.toFixed(2)}`, { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Transactions: ${(sales || []).length}`, { align: 'right' });
    doc.moveDown();

    // Table
    const tableTop = doc.y;
    const colWidths = [20, 80, 60, 50, 50, 50];
    const headers = ['#', 'Receipt', 'Date', 'Cashier', 'Payment', 'Total'];

    doc.font('Helvetica-Bold').fontSize(8);
    let xPos = 30;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveDown(0.3);
    let rowY = doc.y;
    doc.font('Helvetica').fontSize(7);

    (sales || []).forEach((sale, index) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 30;
      }

      xPos = 30;
      const rowData = [
        (index + 1).toString(),
        sale.receipt_number,
        new Date(sale.created_at).toLocaleDateString(),
        sale.users?.name || 'N/A',
        sale.payment_method?.toUpperCase() || 'N/A',
        `₱${Number(sale.total).toFixed(2)}`,
      ];

      rowData.forEach((text, i) => {
        doc.text(text, xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      rowY += 12;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Export sales report as Excel
 */
export const exportSalesExcel = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('sales')
      .select('*, users!sales_cashier_id_fkey(name)')
      .eq('status', 'completed');

    query = buildDateFilter(query, 'created_at', startDate, endDate);

    const { data: sales } = await query.order('created_at', { ascending: false });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Receipt #', key: 'receipt_number', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Cashier', key: 'cashier', width: 20 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'VAT', key: 'vat', width: 10 },
      { header: 'Discount', key: 'discount', width: 10 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Payment', key: 'payment', width: 12 },
      { header: 'Method', key: 'method', width: 10 },
    ];

    (sales || []).forEach(sale => {
      worksheet.addRow({
        receipt_number: sale.receipt_number,
        date: new Date(sale.created_at).toLocaleDateString(),
        cashier: sale.users?.name || 'N/A',
        subtotal: Number(sale.subtotal).toFixed(2),
        vat: Number(sale.vat).toFixed(2),
        discount: Number(sale.discount_amount).toFixed(2),
        total: Number(sale.total).toFixed(2),
        payment: Number(sale.payment_amount).toFixed(2),
        method: sale.payment_method?.toUpperCase() || 'N/A',
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales_report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Export inventory report as PDF
 */
export const exportInventoryPdf = async (req, res, next) => {
  try {
    const { data: products } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .order('name');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=inventory_report_${Date.now()}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(18).font('Helvetica-Bold').text('Inventory Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    const totalValue = (products || []).reduce((sum, p) => sum + (Number(p.current_stock) * Number(p.cost_price || 0)), 0);
    doc.fontSize(10).text(`Total Items: ${(products || []).length}  |  Total Value: ₱${totalValue.toFixed(2)}`, { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [20, 100, 60, 50, 50, 50];
    const headers = ['#', 'Product Name', 'Category', 'Price', 'Stock', 'Value'];

    doc.font('Helvetica-Bold').fontSize(8);
    let xPos = 30;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveDown(0.3);
    let rowY = doc.y;
    doc.font('Helvetica').fontSize(7);

    (products || []).forEach((product, index) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 30;
      }

      xPos = 30;
      const rowData = [
        (index + 1).toString(),
        product.name.substring(0, 25),
        product.categories?.name || 'N/A',
        `₱${Number(product.selling_price).toFixed(2)}`,
        product.current_stock?.toString() || '0',
        `₱${(Number(product.current_stock) * Number(product.cost_price || 0)).toFixed(2)}`,
      ];

      rowData.forEach((text, i) => {
        doc.text(text, xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      rowY += 12;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Export inventory report as Excel
 */
export const exportInventoryExcel = async (req, res, next) => {
  try {
    const { data: products } = await supabase
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .eq('is_active', true)
      .order('name');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');

    worksheet.columns = [
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost Price', key: 'cost_price', width: 12 },
      { header: 'Selling Price', key: 'selling_price', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Min Stock', key: 'min_stock', width: 10 },
      { header: 'Stock Value', key: 'stock_value', width: 12 },
    ];

    (products || []).forEach(product => {
      worksheet.addRow({
        barcode: product.barcode || '',
        sku: product.sku || '',
        name: product.name,
        category: product.categories?.name || '',
        supplier: product.suppliers?.name || '',
        unit: product.unit,
        cost_price: Number(product.cost_price).toFixed(2),
        selling_price: Number(product.selling_price).toFixed(2),
        stock: product.current_stock,
        min_stock: product.min_stock,
        stock_value: (Number(product.current_stock) * Number(product.cost_price || 0)).toFixed(2),
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventory_report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};