import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { default as Label } from '@/components/ui/Label';
import { default as Select } from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useReceivingList, useSuppliers, useProducts } from '@/hooks/useQueries';
import { useCreateReceiving, useUpdateReceiving } from '@/hooks/useMutations';
import { receivingAPI } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Plus, Printer, Eye, X, Search, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Skeleton';

const Receiving = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingReceiving, setViewingReceiving] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Cached queries
  const { data: receivingData, isLoading, refetch } = useReceivingList({ page, limit: 20 });
  const { data: suppliers = [] } = useSuppliers();
  const { data: productsData } = useProducts({ limit: 100 });
  const products = productsData?.items || [];

  const receivingList = receivingData?.items || [];
  const totalPages = receivingData?.totalPages || 1;

  // Mutations
  const createReceivingMutation = useCreateReceiving();
  const updateReceivingMutation = useUpdateReceiving();

  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    notes: '',
    items: [],
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemDetails, setItemDetails] = useState({
    quantity: 1,
    cost_price: 0,
    batch_number: '',
    expiration_date: '',
  });

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || itemDetails.quantity <= 0) {
      toast.error('Please select a product and enter valid quantity');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem = {
      product_id: selectedProduct,
      product_name: product.name,
      barcode: product.barcode,
      quantity: itemDetails.quantity,
      cost_price: itemDetails.cost_price || product.cost_price,
      batch_number: itemDetails.batch_number,
      expiration_date: itemDetails.expiration_date,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedProduct('');
    setItemDetails({ quantity: 1, cost_price: 0, batch_number: '', expiration_date: '' });
  }, [selectedProduct, itemDetails, products]);

  const removeItem = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      if (editingId) {
        await updateReceivingMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        await createReceivingMutation.mutateAsync(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ invoice_number: '', supplier_id: '', notes: '', items: [] });
    } catch (err) {
      // Error handled in mutation
    }
  }, [formData, editingId, createReceivingMutation, updateReceivingMutation]);

  const handleView = useCallback(async (id) => {
    try {
      const res = await receivingAPI.getById(id);
      setViewingReceiving(res.data);
    } catch (err) {
      toast.error('Failed to load receiving details');
    }
  }, []);

  const handlePrint = useCallback(async (id) => {
    try {
      const res = await receivingAPI.print(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Failed to print');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receiving</h1>
          <p className="text-sm text-gray-500">Manage incoming inventory</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ invoice_number: '', supplier_id: '', notes: '', items: [] }); }}>
          <Plus className="h-4 w-4 mr-1" /> New Receiving
        </Button>
      </div>

      {/* Receiving List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receiving Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : receivingList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No receiving records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receiving #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivingList.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs">{rec.receiving_number}</TableCell>
                      <TableCell>{new Date(rec.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{rec.suppliers?.name || 'N/A'}</TableCell>
                      <TableCell>{rec.invoice_number || '—'}</TableCell>
                      <TableCell className="text-right">₱{parseFloat(rec.total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleView(rec.id)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(rec.id)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
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
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Receiving Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Receiving' : 'New Receiving'}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Supplier</Label>
                  <Select value={formData.supplier_id} onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))} required>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Invoice Number</Label>
                  <Input value={formData.invoice_number} onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))} placeholder="Optional" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border rounded-lg p-2 text-sm"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              {/* Add Items */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Add Items</h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Product</Label>
                    <Select value={selectedProduct} onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value);
                      setSelectedProduct(e.target.value);
                      if (product) {
                        setItemDetails(prev => ({ ...prev, cost_price: product.cost_price || 0 }));
                      }
                    }}>
                      <option value="">Select product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.barcode || p.sku}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input type="number" min="1" value={itemDetails.quantity} onChange={(e) => setItemDetails(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div>
                    <Label>Cost Price</Label>
                    <Input type="number" step="0.01" min="0" value={itemDetails.cost_price} onChange={(e) => setItemDetails(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={handleAddItem} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Batch Number</Label>
                    <Input value={itemDetails.batch_number} onChange={(e) => setItemDetails(prev => ({ ...prev, batch_number: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div>
                    <Label>Expiration Date</Label>
                    <Input type="date" value={itemDetails.expiration_date} onChange={(e) => setItemDetails(prev => ({ ...prev, expiration_date: e.target.value }))} />
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Items ({formData.items.length})</h4>
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} | Cost: ₱{parseFloat(item.cost_price).toFixed(2)}
                              {item.batch_number && ` | Batch: ${item.batch_number}`}
                              {item.expiration_date && ` | Exp: ${new Date(item.expiration_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                <Button type="submit" isLoading={createReceivingMutation.isPending || updateReceivingMutation.isPending}>
                  {editingId ? 'Update Receiving' : 'Create Receiving'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receiving Modal */}
      {viewingReceiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Receiving Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setViewingReceiving(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500">Receiving #</label><p className="font-mono">{viewingReceiving.receiving_number}</p></div>
                <div><label className="text-xs text-gray-500">Date</label><p>{new Date(viewingReceiving.created_at).toLocaleString()}</p></div>
                <div><label className="text-xs text-gray-500">Supplier</label><p>{viewingReceiving.suppliers?.name || 'N/A'}</p></div>
                <div><label className="text-xs text-gray-500">Invoice</label><p>{viewingReceiving.invoice_number || '—'}</p></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Notes</label><p>{viewingReceiving.notes || '—'}</p></div>
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingReceiving.items || []).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.products?.name || item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.products?.barcode || '—'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{parseFloat(item.cost_price).toFixed(2)}</TableCell>
                        <TableCell>₱{parseFloat((item.quantity * item.cost_price)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">Total: ₱{parseFloat(viewingReceiving.total_cost || 0).toFixed(2)}</div>
                <Button variant="outline" onClick={() => handlePrint(viewingReceiving.id)}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receiving;