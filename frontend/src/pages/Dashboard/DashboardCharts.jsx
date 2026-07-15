import React, { memo, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return '₱0.00';
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DashboardCharts = memo(({ data }) => {
  const pieData = useMemo(() => {
    return data?.categorySales?.categories?.map(c => ({ name: c.name, value: c.sales })) || [];
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend */}
      <Card>
        <CardHeader className="pb-0"><CardTitle className="text-base sm:text-lg">Sales Trend (7 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.graphData || []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
              <BarChart data={(data?.bestSellers || []).slice(0, 7)} layout="vertical">
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
              <AreaChart data={data?.dailySales?.hourly || []}>
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
  );
});

DashboardCharts.displayName = 'DashboardCharts';

export default DashboardCharts;