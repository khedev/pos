import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, UserCheck, ShoppingCart, DollarSign, Package,
  HeartPulse, Clock, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { activityAPI, dashboardAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const formatCurrency = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const ActivityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [systemHealth, setSystemHealth] = useState({ status: 'healthy', uptime: '0h', dbSize: '0 MB' });
  const [summary, setSummary] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activityRes, usersRes, healthRes, summaryRes] = await Promise.all([
        activityAPI.getActivity({ limit: 20 }),
        activityAPI.getActiveUsers(),
        activityAPI.getSystemHealth(),
        dashboardAPI.getSummary().catch(() => ({ data: {} })),
      ]);
      setActivity(activityRes.data?.items || activityRes.data || []);
      setActiveUsers(usersRes.data?.count || 0);
      setSystemHealth(healthRes.data || { status: 'healthy', uptime: '0h', dbSize: '0 MB' });
      setSummary(summaryRes.data || {});
    } catch (err) {
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">Retry</button>
        </div>
      </div>
    );
  }

  const stats = [
    { title: 'Active Users', value: activeUsers, icon: Users, color: 'bg-blue-500' },
    { title: 'Sales Today', value: formatCurrency(summary?.dailySales), icon: DollarSign, color: 'bg-green-500' },
    { title: 'Transactions', value: summary?.dailyTransactions || 0, icon: ShoppingCart, color: 'bg-purple-500' },
    { title: 'Inventory Value', value: formatCurrency(summary?.inventoryValue), icon: Package, color: 'bg-indigo-500' },
    { title: 'System Status', value: systemHealth.status?.toUpperCase() || 'HEALTHY', icon: HeartPulse, color: systemHealth.status === 'healthy' ? 'bg-green-500' : 'bg-red-500' },
    { title: 'Uptime', value: systemHealth.uptime || '0h', icon: Clock, color: 'bg-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Dashboard</h1>
          <p className="text-sm text-gray-500">System health and real-time activity</p>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{stat.title}</p>
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Activities</CardTitle></CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Activity className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No recent activity</p></div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activity.map((act, i) => (
                  <div key={act.id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="p-1.5 rounded-full bg-gray-100">
                      <Activity className="h-3 w-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{act.action || act.description || 'Activity'}</p>
                      <p className="text-xs text-gray-400">{act.entity ? `${act.entity} • ` : ''}{new Date(act.created_at || Date.now()).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader><CardTitle className="text-lg">System Health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">System Status</span>
              </div>
              <Badge variant="success">{systemHealth.status?.toUpperCase() || 'HEALTHY'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Uptime</p>
                <p className="font-semibold">{systemHealth.uptime || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Database Size</p>
                <p className="font-semibold">{systemHealth.dbSize || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Active Users</p>
                <p className="font-semibold">{activeUsers}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Low Stock Items</p>
                <p className="font-semibold text-yellow-600">{summary?.lowStock || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityDashboard;