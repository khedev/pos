import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  DollarSign, TrendingUp, Calendar, Wallet, Coins, Package, Users,
  AlertTriangle, Clock, ShoppingCart, Loader2, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { dashboardAPI } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return '₱0.00';
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const SummaryCard = memo(({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
));

const Dashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [dailySales, setDailySales] = useState({ sales: [], hourly: [] });
  const [categorySales, setCategorySales] = useState({ categories: [] });
  const [bestSellers, setBestSellers] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, graphRes, dailyRes, catRes, itemRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getGraph(),
        dashboardAPI.getDailySales(),
        dashboardAPI.getCategorySales(),
        dashboardAPI.getItemSales(),
      ]);
      setSummary(summaryRes.data);
      setGraphData(graphRes.data?.data || graphRes.data?.labels?.map((l, i) => ({
        label: l, sales: graphRes.data?.values?.[i] || 0, count: graphRes.data?.counts?.[i] || 0,
      })) || []);
      setDailySales(dailyRes.data);
      setCategorySales(catRes.data);
      setBestSellers(itemRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="mt-4 text-red-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Today's Sales", value: formatCurrency(summary?.dailySales), icon: DollarSign, color: 'bg-blue-500', subtitle: `${summary?.dailyTransactions || 0} transactions` },
    { title: 'Weekly Sales', value: formatCurrency(summary?.weeklySales), icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Monthly Sales', value: formatCurrency(summary?.monthlySales), icon: Calendar, color: 'bg-purple-500' },
    { title: 'Revenue', value: formatCurrency(summary?.revenue), icon: Wallet, color: 'bg-emerald-500' },
    { title: 'Profit', value: formatCurrency(summary?.profit), icon: Coins, color: 'bg-amber-500' },
    { title: 'Inventory Value', value: formatCurrency(summary?.inventoryValue), icon: Package, color: 'bg-indigo-500' },
    { title: 'Active Cashiers', value: summary?.activeCashiers || 0, icon: Users, color: 'bg-cyan-500' },
    { title: 'Low Stock Items', value: summary?.lowStock || 0, icon: AlertTriangle, color: 'bg-yellow-500' },
    { title: 'Expiring Medicines', value: summary?.expiringMedicines || 0, icon: Clock, color: 'bg-red-500' },
    { title: "Today's Transactions", value: summary?.dailyTransactions || 0, icon: ShoppingCart, color: 'bg-blue-600' },
  ];

  const pieData = categorySales?.categories?.map(c => ({ name: c.name, value: c.sales })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-base sm:text-lg">Sales Trend (7 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Sales']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Sales" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Sales */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Category Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Best Sellers */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Best Selling Products</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellers.slice(0, 7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [value, 'Quantity Sold']} />
                  <Bar dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Sales */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Hourly Sales Today</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Sales']} />
                  <Area type="monotone" dataKey="sales" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <span className="text-sm text-gray-400">{dailySales.count || 0} today</span>
        </CardHeader>
        <CardContent>
          {dailySales.sales?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySales.sales.slice(0, 10).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">{sale.receipt_number}</TableCell>
                    <TableCell>{new Date(sale.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      <Badge variant={sale.payment_method === 'cash' ? 'success' : 'info'}>
                        {sale.payment_method?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No transactions today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;