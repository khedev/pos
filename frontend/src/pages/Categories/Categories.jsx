import React, { useState, useCallback } from 'react';
import {
  FolderTree, Plus, Edit, Trash2, Loader2, Search, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/modal/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useCategoriesPaginated } from '@/hooks/useQueries';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useMutations';

const INITIAL_CATEGORY = { name: '', description: '' };

const Categories = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(INITIAL_CATEGORY);
  const limit = 20;

  // Cached query
  const { data: categoriesData, isLoading, isFetching } = useCategoriesPaginated({ page, limit, search });
  const categories = categoriesData?.items || categoriesData || [];
  const total = categoriesData?.total || 0;
  const totalPages = categoriesData?.totalPages || 0;

  // Mutations
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const openAddModal = useCallback(() => {
    setModalMode('add');
    setFormData(INITIAL_CATEGORY);
    setSelectedCategory(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((cat) => {
    setModalMode('edit');
    setSelectedCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await createMutation.mutateAsync(formData);
      } else {
        await updateMutation.mutateAsync({ id: selectedCategory.id, data: formData });
      }
      setShowModal(false);
    } catch (err) {
      // Error handled in mutation
    }
  }, [formData, modalMode, selectedCategory, createMutation, updateMutation]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Manage product categories</p>
        </div>
        <Button onClick={openAddModal}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search categories..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>Categories ({total})</span>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No categories found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{cat.description || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(cat.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-gray-500">Page {page} of {totalPages} ({total} items)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? 'Add Category' : 'Edit Category'}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="category-form" isLoading={createMutation.isPending || updateMutation.isPending}>
              {modalMode === 'add' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg p-2 text-sm" rows={3} />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;