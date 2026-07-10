import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { default as Label } from '@/components/ui/Label';
import { default as Select } from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { receivingAPI, suppliersAPI, inventoryAPI } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Receiving = () => {
  const navigate = useNavigate();
  const [receivingList, setReceivingList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingReceiving, setViewingReceiving] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  useEffect(() => {
    loadReceiving();
    loadSuppliers();
    loadProducts();
  }, [page]);

  const loadReceiving = async () => {
    try {
      setLoading(true);
      const response = await receivingAPI.getAll({ page, limit: 20 });
      setReceivingList(response.data.items);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Failed to load receiving records');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load suppliers', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await inventoryAPI.getAll({ limit: 100 });
      setProducts(response.data.items);
    } catch (error) {
      console.error('Failed to load products', error);
    }
  };

  const handleAddItem = () => {
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

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setSelectedProduct('');
    setItemDetails({
      quantity: 1,
      cost_price: 0,
      batch_number: '',
      expiration_date: '',
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleBarcodeSearch = (e) => {
    if (e.key === 'Enter') {
      const product = products.find(p => p.barcode === e.target.value);
      if (product) {
        setSelectedProduct(product.id);
        setItemDetails({
          ...itemDetails,
          cost_price: product.cost_price,
        });
        e.target.value = '';
        toast.success(`Found: ${product.name}`);
      } else {
        toast.error('Product not found');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      if (editingId) {
        await receivingAPI.update(editingId, formData);
        toast.success('Receiving updated successfully');
      } else {
        await receivingAPI.create(formData);
        toast.success('Receiving created successfully');
      }

      resetForm();
      loadReceiving();
    } catch (error) {
      toast.error(editingId ? 'Failed to update receiving' : 'Failed to create receiving');
      console.error(error);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await receivingAPI.getById(id);
      const receiving = response.data;

      setFormData({
        invoice_number: receiving.invoice_number || '',
        supplier_id: receiving.supplier_id || '',
        notes: receiving.notes || '',
        items: receiving.items?.map(item => ({
          product_id: item.product_id,
          product_name: item.products?.name,
          barcode: item.products?.barcode,
          quantity: item.quantity,
          cost_price: item.cost_price,
          batch_number: item.batch_number,
          expiration_date: item.expiration_date,
        })) || [],
      });

      setEditingId(id);
      setShowForm(true);
      setViewingReceiving(null);
    } catch (error) {
      toast.error('Failed to load receiving details');
      console.error(error);
    }
  };

  const handleView = async (id) => {
    try {
      const response = await receivingAPI.getById(id);
      setViewingReceiving(response.data);
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      toast.error('Failed to load receiving details');
      console.error(error);
    }
  };

  const handlePrint = async (id) => {
    try {
      const response = await receivingAPI.print(id);
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      printWindow?.print();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to print receiving slip');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      supplier_id: '',
      notes: '',
      items: [],
    });
    setShowForm(false);
    setEditingId(null);
    setViewingReceiving(null);
  };

  const totalCost = formData.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Item Receiving</h1>
          <p className="text-sm text-gray-500">Receive stock from suppliers</p>
        </div>
        {!showForm && !viewingReceiving && (
          <Button onClick={() => setShowForm(true)}>
            + New Receiving
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Receiving' : 'New Receiving'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Enter invoice number"
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    id="supplier"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter notes (optional)"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Add Items</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="barcode">Barcode Scanner</Label>
                    <Input
                      id="barcode"
                      onKeyDown={handleBarcodeSearch}
                      placeholder="Scan barcode or enter manually"
                    />
                  </div>

                  <div>
                    <Label htmlFor="product">Product</Label>
                    <Select
                      id="product"
                      value={selectedProduct}
                      onChange={(e) => {
                        setSelectedProduct(e.target.value);
                        const product = products.find(p => p.id === e.target.value);
                        if (product) {
                          setItemDetails({
                            ...itemDetails,
                            cost_price: product.cost_price,
                          });
                        }
                      }}
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.barcode})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={itemDetails.quantity}
                      onChange={(e) => setItemDetails({ ...itemDetails, quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cost_price">Unit Cost</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      value={itemDetails.cost_price}
                      onChange={(e) => setItemDetails({ ...itemDetails, cost_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="button" onClick={handleAddItem} className="w-full">
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="batch_number">Batch Number</Label>
                    <Input
                      id="batch_number"
                      value={itemDetails.batch_number}
                      onChange={(e) => setItemDetails({ ...itemDetails, batch_number: e.target.value })}
                      placeholder="Enter batch number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiration_date">Expiration Date</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={itemDetails.expiration_date}
                      onChange={(e) => setItemDetails({ ...itemDetails, expiration_date: e.target.value })}
                    />
                  </div>
                </div>

                {formData.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Batch #</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.barcode || 'N/A'}</TableCell>
                            <TableCell>{item.batch_number || 'N/A'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₱{item.cost_price.toFixed(2)}</TableCell>
                            <TableCell>₱{(item.quantity * item.cost_price).toFixed(2)}</TableCell>
                            <TableCell>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="bg-gray-50 p-4 text-right">
                      <p className="text-lg font-bold">Total Cost: ₱{totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Update Receiving' : 'Create Receiving'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {viewingReceiving && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Receiving Details - {viewingReceiving.receiving_number}</CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => handlePrint(viewingReceiving.id)} size="sm">
                  Print Slip
                </Button>
                <Button onClick={() => handleEdit(viewingReceiving.id)} size="sm">
                  Edit
                </Button>
                <Button onClick={resetForm} variant="secondary" size="sm">
                  Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Receiving Number</p>
                  <p className="font-medium">{viewingReceiving.receiving_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Number</p>
                  <p className="font-medium">{viewingReceiving.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{viewingReceiving.suppliers?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received By</p>
                  <p className="font-medium">{viewingReceiving.users?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(viewingReceiving.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="font-medium text-lg">₱{viewingReceiving.total_cost?.toFixed(2)}</p>
                </div>
              </div>

              {viewingReceiving.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="font-medium">{viewingReceiving.notes}</p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingReceiving.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.products?.name || 'N/A'}</TableCell>
                        <TableCell>{item.batch_number || 'N/A'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{item.cost_price.toFixed(2)}</TableCell>
                        <TableCell>₱{(item.quantity * item.cost_price).toFixed(2)}</TableCell>
                        <TableCell>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && !viewingReceiving && (
        <Card>
          <CardHeader>
            <CardTitle>Receiving Records</CardTitle>
            <div className="mt-4">
              <Input
                placeholder="Search by receiving number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : receivingList.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No receiving records found
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receiving #</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivingList
                      .filter((receiving) =>
                        receiving.receiving_number.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((receiving) => (
                        <TableRow key={receiving.id}>
                          <TableCell className="font-medium">{receiving.receiving_number}</TableCell>
                          <TableCell>{receiving.invoice_number || 'N/A'}</TableCell>
                          <TableCell>{receiving.suppliers?.name || 'N/A'}</TableCell>
                          <TableCell>{receiving.users?.name || 'N/A'}</TableCell>
                          <TableCell>₱{receiving.total_cost?.toFixed(2)}</TableCell>
                          <TableCell>{new Date(receiving.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleView(receiving.id)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePrint(receiving.id)}
                              >
                                Print
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Receiving;