import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Loader2, Search, Calendar, Filter,
  TrendingUp, Package, Truck, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { reportsAPI, categoriesAPI, suppliersAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const formatCurrency = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const TABS = [
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: FileText },
  { id: 'receiving', label: 'Receiving', icon: Truck },
];

const SummaryCard = ({ title, value, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-lg border p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [period, setPeriod] = useState('daily');

  // Data
  const [salesData, setSalesData] = useState({ data: [], summary: null });
  const [itemSalesData, setItemSalesData] = useState({ items: [], bestSellers: [], slowMoving: [], summary: null });
  const [inventoryData, setInventoryData] = useState({ items: [], expiring: [], summary: null });
  const [receivingData, setReceivingData] = useState({ data: [], summary: null });

  // Filters
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Load suppliers once
  useEffect(() => {
    suppliersAPI.getAll().then(res => setSuppliers(res.data?.items || [])).catch(() => {});
  }, []);

  // Fetch data based on tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      switch (activeTab) {
        case 'sales': {
          const res = await reportsAPI.getSales({ ...params, period });
          setSalesData(res.data);
          break;
        }
        case 'products': {
          const res = await reportsAPI.getItemSales(params);
          setItemSalesData(res.data);
          break;
        }
        case 'inventory': {
          const res = await reportsAPI.getInventory({ filter: inventoryFilter || undefined });
          setInventoryData(res.data);
          break;
        }
        case 'receiving': {
          const res = await reportsAPI.getReceiving({ ...params, supplier_id: supplierFilter || undefined });
          setReceivingData(res.data);
          break;
        }
      }
    } catch (err) {
      setError('Failed to load report data');
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, period, inventoryFilter, supplierFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (type, format) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let res;
      if (type === 'sales' && format === 'pdf') res = await reportsAPI.exportSalesPdf(params);
      else if (type === 'sales' && format === 'excel') res = await reportsAPI.exportSalesExcel(params);
      else if (type === 'inventory' && format === 'pdf') res = await reportsAPI.exportInventoryPdf();
      else if (type === 'inventory' && format === 'excel') res = await reportsAPI.exportInventoryExcel();
      else return;

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} ${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const renderSalesTab = () => {
    const { data, summary } = salesData;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

    const trendData = (data || []).reduce((acc, sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = { date, sales: 0, count: 0 };
      acc[date].sales += Number(sale.total);
      acc[date].count++;
      return acc;
    }, {});
    const trendChart = Object.values(trendData);

    const paymentData = summary?.paymentBreakdown?.map(p => ({ name: p.method.toUpperCase(), value: p.total })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard title="Total Sales" value={formatCurrency(summary?.totalSales)} color="text-blue-600" />
          <SummaryCard title="Transactions" value={summary?.totalTransactions || 0} />
          <SummaryCard title="Avg Sale" value={formatCurrency(summary?.averageTransaction)} />
          <SummaryCard title="VAT" value={formatCurrency(summary?.totalVat)} color="text-purple-600" />
          <SummaryCard title="Discounts" value={formatCurrency(summary?.totalDiscounts)} color="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Sales Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Payment Methods</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales table */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Transactions</CardTitle></CardHeader>
          <CardContent>
            {data?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data || []).slice((page - 1) * limit, page * limit).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-xs">{sale.receipt_number}</TableCell>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="info">{sale.payment_method?.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No sales data</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProductsTab = () => {
    const { bestSellers, slowMoving, summary } = itemSalesData;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard title="Items Sold" value={summary?.totalItemsSold || 0} />
          <SummaryCard title="Revenue" value={formatCurrency(summary?.totalRevenue)} color="text-green-600" />
          <SummaryCard title="Cost" value={formatCurrency(summary?.totalCost)} color="text-red-600" />
          <SummaryCard title="Profit" value={formatCurrency(summary?.totalProfit)} color="text-blue-600" />
          <SummaryCard title="Discounts" value={formatCurrency(summary?.totalDiscounts)} color="text-orange-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Best Sellers</CardTitle></CardHeader>
            <CardContent>
              {bestSellers?.length > 0 ? (
                <div className="space-y-2">
                  {bestSellers.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                        <span className="text-sm truncate max-w-[200px]">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.quantity} sold</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Slow Moving Products</CardTitle></CardHeader>
            <CardContent>
              {slowMoving?.length > 0 ? (
                <div className="space-y-2">
                  {slowMoving.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                      <span className="text-sm truncate max-w-[200px]">{item.name}</span>
                      <div className="text-right text-sm">
                        <span className="text-gray-500">{item.stock} in stock</span>
                        <span className="ml-2 text-red-500">{item.sold} sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No slow moving items</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profit chart */}
        {bestSellers?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Products - Revenue vs Profit</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellers.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                    <Bar dataKey="cost" fill="#EF4444" name="Cost" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderInventoryTab = () => {
    const { items, expiring, summary } = inventoryData;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard title="Total Items" value={summary?.totalItems || 0} />
          <SummaryCard title="Stock Value" value={formatCurrency(summary?.totalStockValue)} color="text-green-600" />
          <SummaryCard title="Low Stock" value={summary?.lowStockItems || 0} color="text-yellow-600" />
          <SummaryCard title="Out of Stock" value={summary?.outOfStockItems || 0} color="text-red-600" />
          <SummaryCard title="Expiring" value={summary?.expiringItems || 0} color="text-orange-600" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Inventory Items</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('inventory', 'pdf')}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('inventory', 'excel')}>
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(items || []).slice((page - 1) * limit, page * limit).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-400">{item.sku}</div>
                        </TableCell>
                        <TableCell className="text-sm">{item.category}</TableCell>
                        <TableCell>
                          <span className={item.is_low_stock ? 'text-red-600 font-medium' : ''}>{item.current_stock}</span>
                          <span className="text-xs text-gray-400"> / {item.unit}</span>
                        </TableCell>
                        <TableCell>{formatCurrency(item.selling_price)}</TableCell>
                        <TableCell>{formatCurrency(item.stock_value)}</TableCell>
                        <TableCell>
                          {item.is_out_of_stock ? <Badge variant="destructive">OOS</Badge> :
                           item.is_low_stock ? <Badge variant="warning">Low</Badge> :
                           <Badge variant="success">OK</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No inventory data</p></div>
            )}
          </CardContent>
        </Card>

        {expiring?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Expiring Products</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiring.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{batch.products?.name}</p>
                      <p className="text-xs text-gray-500">Batch: {batch.batch_number} | Qty: {batch.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600">Exp: {new Date(batch.expiration_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderReceivingTab = () => {
    const { data, summary } = receivingData;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard title="Total Receivings" value={summary?.totalReceiving || 0} />
          <SummaryCard title="Total Cost" value={formatCurrency(summary?.totalCost)} color="text-blue-600" />
          <SummaryCard title="Average Cost" value={formatCurrency(summary?.averageCost)} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Receiving History</CardTitle></CardHeader>
          <CardContent>
            {data?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receiving #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data || []).slice((page - 1) * limit, page * limit).map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-mono text-xs">{rec.receiving_number}</TableCell>
                        <TableCell>{new Date(rec.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{rec.suppliers?.name || 'N/A'}</TableCell>
                        <TableCell>{rec.invoice_number || '—'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(rec.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400"><Truck className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No receiving data</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">View, analyze, and export reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {(activeTab === 'sales' || activeTab === 'products' || activeTab === 'receiving') && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 h-9 text-sm" />
                  <span className="text-gray-400">to</span>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 h-9 text-sm" />
                </div>
                {activeTab === 'sales' && (
                  <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-32 h-9 text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </Select>
                )}
              </>
            )}
            {activeTab === 'inventory' && (
              <Select value={inventoryFilter} onChange={(e) => setInventoryFilter(e.target.value)} className="w-40 h-9 text-sm">
                <option value="">All Items</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </Select>
            )}
            {activeTab === 'receiving' && (
              <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="w-48 h-9 text-sm">
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}

            {/* Export buttons */}
            {(activeTab === 'sales') && (
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => handleExport('sales', 'pdf')}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('sales', 'excel')}>
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
              <Filter className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'sales' && renderSalesTab()}
      {activeTab === 'products' && renderProductsTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
      {activeTab === 'receiving' && renderReceivingTab()}

      {/* Pagination */}
      {((activeTab === 'sales' && salesData.data?.length > limit) ||
        (activeTab === 'inventory' && inventoryData.items?.length > limit) ||
        (activeTab === 'receiving' && receivingData.data?.length > limit)) && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-gray-500">Page {page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;