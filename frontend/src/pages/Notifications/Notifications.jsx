import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Loader2, CheckCheck, Trash2, X, Info, AlertTriangle,
  AlertCircle, Package, ShoppingCart, Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  low_stock: Package,
  sale: ShoppingCart,
  receiving: Truck,
};

const TYPE_COLORS = {
  info: 'bg-blue-100 text-blue-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
  low_stock: 'bg-orange-100 text-orange-600',
  sale: 'bg-green-100 text-green-600',
  receiving: 'bg-purple-100 text-purple-600',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsAPI.getAll({ limit: 50 }),
        notificationsAPI.getUnreadCount(),
      ]);
      setNotifications(listRes.data?.items || listRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) { toast.error('Failed to mark all as read'); }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Info;
                const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${notif.is_read ? 'bg-white' : 'bg-blue-50 border border-blue-100'}`}
                  >
                    <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm ${notif.is_read ? 'text-gray-700' : 'font-medium text-gray-900'}`}>
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {!notif.is_read && (
                            <button onClick={() => handleMarkRead(notif.id)} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Mark as read">
                              <CheckCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(notif.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;