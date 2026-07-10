import { supabaseAdmin as supabase } from '../config/supabase.js';

export const getActivity = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: activeUsers },
      { data: salesToday },
      { count: lowStock },
      { count: outOfStock },
      { data: recentActivity },
      { data: recentErrors },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('sales').select('total').gte('created_at', today.toISOString()).eq('status', 'completed'),
      supabase.from('products').select('*', { count: 'exact', head: true }).lte('current_stock', 'min_stock').eq('is_active', true),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('current_stock', 0).eq('is_active', true),
      supabase.from('audit_logs').select('*, users(name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('audit_logs').select('*, users(name)').eq('action', 'ERROR').order('created_at', { ascending: false }).limit(5),
    ]);

    const salesTotal = (salesToday || []).reduce((sum, s) => sum + Number(s.total), 0);

    const { data: products } = await supabase
      .from('products')
      .select('current_stock, cost_price')
      .eq('is_active', true);

    const inventoryValue = (products || []).reduce(
      (sum, p) => sum + Number(p.current_stock || 0) * Number(p.cost_price || 0),
      0
    );

    res.json({
      activeUsers: activeUsers || 0,
      salesToday: salesTotal,
      lowStock: lowStock || 0,
      outOfStock: outOfStock || 0,
      inventoryValue,
      systemHealth: 'healthy',
      recentActivity: recentActivity || [],
      recentErrors: recentErrors || [],
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};