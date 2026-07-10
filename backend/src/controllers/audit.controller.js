import { supabaseAdmin as supabase } from '../config/supabase.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      user_id, entity, action, startDate, endDate,
      search, page = 1, limit = 20,
    } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*, users(name, email)', { count: 'exact' });

    if (user_id) query = query.eq('user_id', user_id);
    if (entity) query = query.eq('entity', entity);
    if (action) query = query.eq('action', action);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (search) {
      query = query.or(`action.ilike.%${search}%,entity.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

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

export const exportAuditLogs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 22 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Entity', key: 'entity', width: 20 },
      { header: 'Details', key: 'details', width: 50 },
    ];

    data.forEach((log) => {
      worksheet.addRow({
        date: new Date(log.created_at).toLocaleString(),
        user: log.users?.name || 'System',
        action: log.action,
        entity: log.entity,
        details: JSON.stringify(log.details || {}),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};