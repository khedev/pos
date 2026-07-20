import React, { useState, useCallback } from 'react';
import {
  Building2, Plus, Edit, Trash2, Loader2, Search, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/modal/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useSuppliersPaginated } from '@/hooks/useQueries';
import { useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useMutations';

const INITIAL_SUPPLIER = { name: '', contact_person: '', email: '', phone: '', address: '' };

const Suppliers = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(INITIAL_SUPPLIER);

  // Cached query
  const { data: suppliersData, isLoading, isFetching } = useSuppliersPaginated({ search });
  const suppliers = suppliersData?.items || suppliersData || [];

  // Mutations
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const openAdd = useCallback(() => {
    setModalMode('add');
    setFormData(INITIAL_SUPPLIER);
    setSelected(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((s) => {
    setModalMode('edit');
    setSelected(s);
    setFormData({
      name: s.name,
      contact_person: s.contact_person || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await createMutation.mutateAsync(formData);
      } else {
        await updateMutation.mutateAsync({ id: selected.id, data: formData });
      }
      setShowModal(false);
    } catch (err) {
      // Error handled in mutation
    }
  }, [formData, modalMode, selected, createMutation, updateMutation]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500">Manage suppliers and vendors</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>Suppliers ({suppliers.length})</span>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No suppliers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{s.contact_person || '—'}</TableCell>
                      <TableCell className="text-sm">{s.email || '—'}</TableCell>
                      <TableCell className="text-sm">{s.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
            <Button type="submit" form="supplier-form" isLoading={createMutation.isPending || updateMutation.isPending}>
              {modalMode === 'add' ? 'Create' : 'Save'}
            </Button>
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