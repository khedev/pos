/**
 * Dashboard Controller - Complete analytics and metrics
 */
import { supabaseAdmin as supabase } from '../config/supabase.js';

/**
 * Get comprehensive dashboard summary
 */
export const getSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get all completed sales
    const { data: completedSales } = await supabase
      .from('sales')
      .select('created_at, total, subtotal, vat')
      .eq('status', 'completed');

    const sales = completedSales || [];

    // Calculate period sales
    const dailySales = sales
      .filter(s => new Date(s.created_at) >= today)
      .reduce((sum, s) => sum + Number(s.total), 0);

    const weeklySales = sales
      .filter(s => new Date(s.created_at) >= weekStart)
      .reduce((sum, s) => sum + Number(s.total), 0);

    const monthlySales = sales
      .filter(s => new Date(s.created_at) >= monthStart)
      .reduce((sum, s) => sum + Number(s.total), 0);

    const annualSales = sales
      .filter(s => new Date(s.created_at) >= yearStart)
      .reduce((sum, s) => sum + Number(s.total), 0);

    const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalVat = sales.reduce((sum, s) => sum + Number(s.vat || 0), 0);

    // Profit calculation
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('subtotal, cost');

    const totalRevenue = (saleItems || []).reduce((sum, i) => sum + Number(i.subtotal), 0);
    const totalCost = (saleItems || []).reduce((sum, i) => sum + Number(i.cost || 0), 0);
    const profit = totalRevenue - totalCost;

    // Transaction counts
    const dailyTransactions = sales.filter(s => new Date(s.created_at) >= today).length;
    const totalTransactions = sales.length;

    // Inventory metrics
    const { data: products } = await supabase
      .from('products')
      .select('current_stock, min_stock, selling_price, cost_price')
      .eq('is_active', true);

    const productList = products || [];
    const inventoryValue = productList.reduce((sum, p) => sum + (Number(p.current_stock) * Number(p.cost_price || 0)), 0);
    const lowStock = productList.filter(p => p.min_stock > 0 && Number(p.current_stock) <= Number(p.min_stock)).length;
    const outOfStock = productList.filter(p => Number(p.current_stock) <= 0).length;

    // Active cashiers
    const { count: activeCashiers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'cashier')
      .eq('is_active', true);

    // Expiring medicines (within 30 days)
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const { count: expiringMedicines } = await supabase
      .from('product_batches')
      .select('*', { count: 'exact', head: true })
      .lte('expiration_date', thirtyDays.toISOString())
      .gt('expiration_date', now.toISOString())
      .gt('quantity', 0);

    res.json({
      dailySales,
      weeklySales,
      monthlySales,
      annualSales,
      revenue,
      profit,
      inventoryValue,
      totalVat,
      activeCashiers: activeCashiers || 0,
      dailyTransactions,
      totalTransactions,
      lowStock,
      outOfStock,
      expiringMedicines: expiringMedicines || 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales graph data (7-day trend)
 */
export const getGraph = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: sales } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('status', 'completed')
      .order('created_at');

    // Group by day
    const dailyData = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { date: key, label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), sales: 0, count: 0 };
    }

    (sales || []).forEach(sale => {
      const key = new Date(sale.created_at).toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].sales += Number(sale.total);
        dailyData[key].count++;
      }
    });

    const labels = Object.values(dailyData).map(d => d.label);
    const values = Object.values(dailyData).map(d => d.sales);
    const counts = Object.values(dailyData).map(d => d.count);

    res.json({ labels, values, counts, data: Object.values(dailyData) });
  } catch (error) {
    next(error);
  }
};

/**
 * Get today's sales with hourly breakdown
 */
export const getDailySales = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Hourly breakdown
    const hourly = {};
    for (let h = 0; h < 24; h++) {
      hourly[h] = { hour: h, label: `${h.toString().padStart(2, '0')}:00`, sales: 0, count: 0 };
    }

    (sales || []).forEach(sale => {
      const hour = new Date(sale.created_at).getHours();
      if (hourly[hour]) {
        hourly[hour].sales += Number(sale.total);
        hourly[hour].count++;
      }
    });

    res.json({
      sales: sales || [],
      hourly: Object.values(hourly),
      total: sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
      count: sales?.length || 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales by category
 */
export const getCategorySales = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('sale_items')
      .select(`
        subtotal, quantity,
        products!inner(
          category_id,
          categories!inner(name)
        )
      `);

    const categoryMap = {};
    (data || []).forEach(item => {
      const catName = item.products?.categories?.name || 'Uncategorized';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, sales: 0, quantity: 0 };
      }
      categoryMap[catName].sales += Number(item.subtotal);
      categoryMap[catName].quantity += item.quantity;
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.sales - a.sales);
    const totalSales = categories.reduce((sum, c) => sum + c.sales, 0);

    res.json({ categories, totalSales });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top selling items
 */
export const getItemSales = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('sale_items')
      .select('product_id, quantity, subtotal, cost, products(name, sku, selling_price, current_stock)')
      .order('quantity', { ascending: false })
      .limit(10);

    const items = (data || []).map(item => ({
      id: item.product_id,
      name: item.products?.name || 'Unknown',
      sku: item.products?.sku,
      quantity: item.quantity,
      revenue: Number(item.subtotal),
      cost: Number(item.cost || 0),
      profit: Number(item.subtotal) - Number(item.cost || 0),
      price: Number(item.products?.selling_price || 0),
      stock: Number(item.products?.current_stock || 0),
    }));

    res.json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly sales breakdown
 */
export const getWeeklySales = async (req, res, next) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const { data: sales } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .eq('status', 'completed')
      .order('created_at');

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyData = days.map((name, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return { day: name, date: date.toISOString().split('T')[0], sales: 0, count: 0 };
    });

    (sales || []).forEach(sale => {
      const dayOfWeek = new Date(sale.created_at).getDay();
      dailyData[dayOfWeek].sales += Number(sale.total);
      dailyData[dayOfWeek].count++;
    });

    const total = dailyData.reduce((sum, d) => sum + d.sales, 0);

    res.json({ days: dailyData, total, average: total / 7 });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly sales breakdown
 */
export const getMonthlySales = async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: sales } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .eq('status', 'completed')
      .order('created_at');

    // Group by week
    const weeklyData = [];
    let currentWeek = { week: 1, start: monthStart, sales: 0, count: 0 };
    let weekNum = 1;

    (sales || []).forEach(sale => {
      const saleDate = new Date(sale.created_at);
      const weekOfMonth = Math.ceil((saleDate.getDate()) / 7);
      if (weekOfMonth !== currentWeek.week) {
        weeklyData.push(currentWeek);
        weekNum = weekOfMonth;
        currentWeek = { week: weekNum, start: saleDate, sales: 0, count: 0 };
      }
      currentWeek.sales += Number(sale.total);
      currentWeek.count++;
    });
    if (currentWeek.sales > 0 || currentWeek.count > 0) {
      weeklyData.push(currentWeek);
    }

    const total = weeklyData.reduce((sum, w) => sum + w.sales, 0);

    res.json({ weeks: weeklyData, total, average: weeklyData.length > 0 ? total / weeklyData.length : 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profit data for charts
 */
export const getProfitData = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: items } = await supabase
      .from('sale_items')
      .select('subtotal, cost, sales!inner(created_at)')
      .gte('sales.created_at', sevenDaysAgo.toISOString());

    const dailyProfit = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyProfit[key] = { date: key, revenue: 0, cost: 0, profit: 0 };
    }

    (items || []).forEach(item => {
      const key = new Date(item.sales.created_at).toISOString().split('T')[0];
      if (dailyProfit[key]) {
        dailyProfit[key].revenue += Number(item.subtotal);
        dailyProfit[key].cost += Number(item.cost || 0);
        dailyProfit[key].profit = dailyProfit[key].revenue - dailyProfit[key].cost;
      }
    });

    res.json(Object.values(dailyProfit));
  } catch (error) {
    next(error);
  }
};

/**
 * Get best selling products
 */
export const getBestSellers = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('sale_items')
      .select('product_id, quantity, subtotal, products(name, sku, selling_price, current_stock)')
      .order('quantity', { ascending: false })
      .limit(10);

    const items = (data || []).map(item => ({
      id: item.product_id,
      name: item.products?.name || 'Unknown',
      sku: item.products?.sku,
      quantity: item.quantity,
      revenue: Number(item.subtotal),
      price: Number(item.products?.selling_price || 0),
      stock: Number(item.products?.current_stock || 0),
    }));

    res.json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * Get slow moving products
 */
export const getSlowMoving = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get products with low sales in last 30 days
    const { data: soldProducts } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const soldMap = {};
    (soldProducts || []).forEach(item => {
      soldMap[item.product_id] = (soldMap[item.product_id] || 0) + item.quantity;
    });

    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, min_stock, selling_price, cost_price')
      .eq('is_active', true);

    const slowMoving = (products || [])
      .map(p => ({
        ...p,
        sold: soldMap[p.id] || 0,
        stockValue: Number(p.current_stock) * Number(p.cost_price || 0),
      }))
      .filter(p => p.sold < 5 && Number(p.current_stock) > 0)
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10);

    res.json(slowMoving);
  } catch (error) {
    next(error);
  }
};

/**
 * Get expiring medicines
 */
export const getExpiringMedicines = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const { data } = await supabase
      .from('product_batches')
      .select(`
        id, batch_number, quantity, expiration_date, cost_price,
        products(id, name, sku, barcode, selling_price)
      `)
      .lte('expiration_date', thirtyDays.toISOString())
      .gt('expiration_date', now.toISOString())
      .gt('quantity', 0)
      .order('expiration_date');

    const items = (data || []).map(batch => ({
      id: batch.id,
      batch_number: batch.batch_number,
      quantity: batch.quantity,
      expiration_date: batch.expiration_date,
      cost_price: batch.cost_price,
      product: batch.products ? {
        id: batch.products.id,
        name: batch.products.name,
        sku: batch.products.sku,
        barcode: batch.products.barcode,
        selling_price: batch.products.selling_price,
      } : null,
      days_remaining: Math.ceil((new Date(batch.expiration_date) - now) / (1000 * 60 * 60 * 24)),
    }));

    res.json(items);
  } catch (error) {
    next(error);
  }
};