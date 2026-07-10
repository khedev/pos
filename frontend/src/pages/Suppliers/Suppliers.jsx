import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Edit, Trash2, Loader2, Search, X, Phone, Mail, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { suppliersAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/modal/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const INITIAL_SUPPLIER = { name: '', contact_person: '', email: '', phone: '', address: '' };

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(INITIAL_SUPPLIER);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersAPI.getAll({ search });
      setSuppliers(res.data?.items || res.data || []);
    } catch (err) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => { setModalMode('add'); setFormData(INITIAL_SUPPLIER); setSelected(null); setShowModal(true); };
  const openEdit = (s) => { setModalMode('edit'); setSelected(s); setFormData({ name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalMode === 'add') { await suppliersAPI.create(formData); toast.success('Supplier created'); }
      else { await suppliersAPI.update(selected.id, formData); toast.success('Supplier updated'); }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try { await suppliersAPI.delete(id); toast.success('Supplier deleted'); fetchSuppliers(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const filtered = (suppliers || []).filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Suppliers</h1><p className="text-sm text-gray-500">Manage suppliers and vendors</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
      <Card><CardContent className="pt-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div></CardContent></Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Suppliers ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
          filtered.length === 0 ? <div className="text-center py-12 text-gray-400"><Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No suppliers found</p></div> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{s.contact_person || '—'}</TableCell>
                    <TableCell className="text-sm">{s.email || '—'}</TableCell>
                    <TableCell className="text-sm">{s.phone || '—'}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? 'Add Supplier' : 'Edit Supplier'}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="supplier-form" isLoading={actionLoading}>{modalMode === 'add' ? 'Create' : 'Save'}</Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
          <div><label className="block text-sm font-medium mb-1">Contact Person</label><Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Phone</label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border rounded-lg p-2 text-sm" rows={2} /></div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;