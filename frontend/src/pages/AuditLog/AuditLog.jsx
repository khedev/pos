import React, { useState } from 'react';
import {
  ScrollText, Loader2, Search, Filter, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auditAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useAuditLogs } from '@/hooks/useQueries';

const ACTION_COLORS = {
  LOGIN: 'info', LOGOUT: 'info', CREATE: 'success', CREATE_USER: 'success',
  UPDATE: 'warning', UPDATE_USER: 'warning', DELETE: 'destructive', DELETE_USER: 'destructive',
  SALE: 'success', VOID: 'destructive', RECEIVING: 'info', ARCHIVE: 'warning',
};

const AuditLog = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', action: '', entity: '', startDate: '', endDate: '' });
  const limit = 20;

  // Cached query with filter-driven cache key
  const { data: logsData, isLoading, isFetching } = useAuditLogs({ page, limit, ...filters });
  const logs = logsData?.items || logsData || [];
  const total = logsData?.total || 0;
  const totalPages = logsData?.totalPages || 0;

  const handleExport = async (format) => {
    try {
      const res = format === 'pdf' ? await auditAPI.exportPdf(filters) : await auditAPI.exportExcel(filters);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Audit log exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Audit Log</h1><p className="text-sm text-gray-500">Track all system activities</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="h-4 w-4 mr-1" /> Excel</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search logs..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filters.action} onChange={(e) => updateFilter('action', e.target.value)} className="w-32 h-9 text-sm">
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="SALE">Sale</option>
              <option value="VOID">Void</option>
              <option value="RECEIVING">Receiving</option>
            </Select>
            <Select value={filters.entity} onChange={(e) => updateFilter('entity', e.target.value)} className="w-32 h-9 text-sm">
              <option value="">All Entities</option>
              <option value="products">Products</option>
              <option value="sales">Sales</option>
              <option value="users">Users</option>
              <option value="receiving">Receiving</option>
              <option value="categories">Categories</option>
              <option value="suppliers">Suppliers</option>
            </Select>
            <Input type="date" value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} className="w-36 h-9 text-sm" />
            <Input type="date" value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} className="w-36 h-9 text-sm" />
            {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary self-center" />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Activity Logs ({total})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
          logs.length === 0 ? <div className="text-center py-12 text-gray-400"><ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No audit logs found</p></div> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Details</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{log.user_id?.slice(0, 8) || 'System'}</TableCell>
                    <TableCell><Badge variant={ACTION_COLORS[log.action] || 'info'} size="sm">{log.action}</Badge></TableCell>
                    <TableCell className="text-sm">{log.entity}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{log.details ? JSON.stringify(log.details).slice(0, 50) : '—'}</TableCell>
                    <TableCell className="text-xs text-gray-400">{log.ip_address || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;