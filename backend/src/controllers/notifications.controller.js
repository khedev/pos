import { supabaseAdmin as supabase } from '../config/supabase.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { unread_only, page = 1, limit = 30 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      items: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ message: 'All marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    next(error);
  }
};

// Helper to create a notification (used internally)
export const createNotification = async ({ userId, type, title, message, link }) => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
    });
  } catch (e) {
    console.error('Failed to create notification:', e.message);
  }
};