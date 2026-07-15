import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Plus, FileDown, FileUp, FileText, Image, Trash2,
  Archive, Eye, Edit, ChevronLeft, ChevronRight, Loader2,
  Upload, X, Package, AlertTriangle, Barcode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/Table';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useProducts, useCategories, useSuppliers } from '@/hooks/useQueries';
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useArchiveProduct, useUploadProductImage, useDeleteProductImage } from '@/hooks/useMutations';
import { inventoryAPI } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const INITIAL_PRODUCT = {
  barcode: '', sku: '', name: '', generic_name: '', brand: '',
  category_id: '', supplier_id: '', unit: 'piece',
  cost_price: '', selling_price: '', current_stock: 0,
  min_stock: '', max_stock: '', image_url: '',
};

const Inventory = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Search & filter
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Use cached queries
  const { data: productsData, isLoading, isFetching, refetch } = useProducts({
    page,
    limit,
    search: debouncedSearch,
    category: categoryFilter,
    supplier: supplierFilter,
    stock_status: stockFilter,
    expiration_status: expirationFilter,
  });
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();

  const products = productsData?.items || [];
  const total = productsData?.total || 0;
  const totalPages = productsData?.totalPages || 0;

  // Mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const archiveProductMutation = useArchiveProduct();
  const uploadImageMutation = useUploadProductImage();
  const deleteImageMutation = useDeleteProductImage();

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_PRODUCT);
  const [actionLoading, setActionLoading] = useState(false);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Image upload
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Debounce search
  const searchTimerRef = React.useRef(null);
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      if (page !== 1) setPage(1);
    }, 400);
  }, [page]);

  // ============================================================
  // MODAL HANDLERS
  // ============================================================
  const openAddModal = useCallback(() => {
    setModalMode('add');
    setFormData(INITIAL_PRODUCT);
    setSelectedProduct(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      barcode: product.barcode || '',
      sku: product.sku || '',
      name: product.name || '',
      generic_name: product.generic_name || '',
      brand: product.brand || '',
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      unit: product.unit || 'piece',
      cost_price: product.cost_price || '',
      selling_price: product.selling_price || '',
      current_stock: product.current_stock || 0,
      min_stock: product.min_stock || '',
      max_stock: product.max_stock || '',
      image_url: product.image_url || '',
    });
    setShowModal(true);
  }, []);

  const openViewModal = useCallback((product) => {
    setModalMode('view');
    setSelectedProduct(product);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedProduct(null);
    setFormData(INITIAL_PRODUCT);
  }, []);

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: formData.max_stock ? parseInt(formData.max_stock) : null,
      };

      if (modalMode === 'add') {
        await createProductMutation.mutateAsync(payload);
      } else {
        await updateProductMutation.mutateAsync({ id: selectedProduct.id, data: payload });
      }
      closeModal();
    } catch (err) {
      // Error handled in mutation
    } finally {
      setActionLoading(false);
    }
  }, [formData, modalMode, selectedProduct, createProductMutation, updateProductMutation, closeModal]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    await deleteProductMutation.mutateAsync(id);
  }, [deleteProductMutation]);

  const handleArchive = useCallback(async (id) => {
    if (!window.confirm('Archive this product? It will be hidden from active listings.')) return;
    await archiveProductMutation.mutateAsync(id);
  }, [archiveProductMutation]);

  // ============================================================
  // IMPORT
  // ============================================================
  const handleImport = useCallback(async () => {
    if (!importFile) return;
    setActionLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await inventoryAPI.importExcel(formData);
      setImportResult(res.data);
      toast.success(res.data.message);
      setShowImport(false);
      setImportFile(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setActionLoading(false);
    }
  }, [importFile, refetch]);

  // ============================================================
  // EXPORT
  // ============================================================
  const handleExportExcel = useCallback(async () => {
    try {
      const res = await inventoryAPI.exportExcel();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    try {
      const res = await inventoryAPI.exportPdf();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  }, []);

  // ============================================================
  // IMAGE UPLOAD
  // ============================================================
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleImageUpload = useCallback(async () => {
    if (!imageFile || !selectedProduct) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      await uploadImageMutation.mutateAsync({ id: selectedProduct.id, formData });
      setShowImageModal(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      // Error handled in mutation
    } finally {
      setActionLoading(false);
    }
  }, [imageFile, selectedProduct, uploadImageMutation]);

  const handleImageDelete = useCallback(async (productId) => {
    if (!window.confirm('Remove product image?')) return;
    await deleteImageMutation.mutateAsync(productId);
    setShowImageModal(false);
  }, [deleteImageMutation]);

  // ============================================================
  // HELPERS
  // ============================================================
  const getCategoryName = useCallback((id) => categories.find((c) => c.id === id)?.name || 'N/A', [categories]);
  const getSupplierName = useCallback((id) => suppliers.find((s) => s.id === id)?.name || 'N/A', [suppliers]);

  const getStockBadge = useCallback((product) => {
    if (product.current_stock <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (product.min_stock > 0 && product.current_stock <= product.min_stock) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  }, []);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Manage products and stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button onClick={openAddModal} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <FileUp className="h-4 w-4 mr-1" /> Import
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, barcode, SKU..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>
            <Select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}>
              <option value="">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </Select>
            <Select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
              <option value="">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </Select>
            <Select value={expirationFilter} onChange={(e) => { setExpirationFilter(e.target.value); setPage(1); }}>
              <option value="">All Expiration</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Products ({total})</span>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 rounded object-cover bg-gray-50"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 rounded bg-gray-100 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}
                             data-fallback>
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate">{product.name}</div>
                        {product.brand && (
                          <div className="text-xs text-gray-500">{product.brand}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.barcode || '—'}</TableCell>
                      <TableCell>{getCategoryName(product.category_id)}</TableCell>
                      <TableCell>
                        <div>₱{parseFloat(product.selling_price || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          Cost: ₱{parseFloat(product.cost_price || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={product.current_stock <= product.min_stock ? 'text-red-600 font-medium' : ''}>
                          {product.current_stock}
                        </span>
                        <span className="text-xs text-gray-400"> / {product.unit}</span>
                      </TableCell>
                      <TableCell>{getStockBadge(product)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewModal(product)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEditModal(product)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => {
                                setSelectedProduct(product);
                                setShowImageModal(true);
                              }} title="Image">
                                <Image className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleArchive(product.id)} title="Archive">
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} title="Delete">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} items)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* ADD/EDIT MODAL */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {modalMode === 'add' ? 'Add Product' : modalMode === 'edit' ? 'Edit Product' : 'Product Details'}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {modalMode === 'view' && selectedProduct ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedProduct.image_url && (
                    <div className="col-span-2 flex justify-center">
                      <img src={selectedProduct.image_url} alt={selectedProduct.name} loading="lazy" decoding="async" className="h-32 w-32 object-cover rounded-lg bg-gray-50" />
                    </div>
                  )}
                  <div><label className="text-xs text-gray-500">Name</label><p className="font-medium">{selectedProduct.name}</p></div>
                  <div><label className="text-xs text-gray-500">Barcode</label><p className="font-mono">{selectedProduct.barcode || '—'}</p></div>
                  <div><label className="text-xs text-gray-500">SKU</label><p>{selectedProduct.sku || '—'}</p></div>
                  <div><label className="text-xs text-gray-500">Brand</label><p>{selectedProduct.brand || '—'}</p></div>
                  <div><label className="text-xs text-gray-500">Category</label><p>{getCategoryName(selectedProduct.category_id)}</p></div>
                  <div><label className="text-xs text-gray-500">Supplier</label><p>{getSupplierName(selectedProduct.supplier_id)}</p></div>
                  <div><label className="text-xs text-gray-500">Unit</label><p>{selectedProduct.unit}</p></div>
                  <div><label className="text-xs text-gray-500">Cost Price</label><p>₱{parseFloat(selectedProduct.cost_price || 0).toFixed(2)}</p></div>
                  <div><label className="text-xs text-gray-500">Selling Price</label><p>₱{parseFloat(selectedProduct.selling_price || 0).toFixed(2)}</p></div>
                  <div><label className="text-xs text-gray-500">Current Stock</label><p>{selectedProduct.current_stock}</p></div>
                  <div><label className="text-xs text-gray-500">Min Stock</label><p>{selectedProduct.min_stock || 0}</p></div>
                  <div><label className="text-xs text-gray-500">Max Stock</label><p>{selectedProduct.max_stock || '—'}</p></div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={closeModal}>Close</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Product Name *</label>
                    <Input name="name" value={formData.name} onChange={handleFormChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Barcode</label>
                    <Input name="barcode" value={formData.barcode} onChange={handleFormChange} placeholder="Scan or type barcode" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <Input name="sku" value={formData.sku} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Generic Name</label>
                    <Input name="generic_name" value={formData.generic_name} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <Input name="brand" value={formData.brand} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Select name="category_id" value={formData.category_id} onChange={handleFormChange}>
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier</label>
                    <Select name="supplier_id" value={formData.supplier_id} onChange={handleFormChange}>
                      <option value="">Select supplier</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <Select name="unit" value={formData.unit} onChange={handleFormChange}>
                      <option value="piece">Piece</option>
                      <option value="box">Box</option>
                      <option value="bottle">Bottle</option>
                      <option value="pack">Pack</option>
                      <option value="kg">Kilogram</option>
                      <option value="g">Gram</option>
                      <option value="l">Liter</option>
                      <option value="ml">Milliliter</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cost Price</label>
                    <Input name="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Selling Price *</label>
                    <Input name="selling_price" type="number" step="0.01" value={formData.selling_price} onChange={handleFormChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Stock</label>
                    <Input name="current_stock" type="number" value={formData.current_stock} onChange={handleFormChange} disabled={modalMode === 'edit'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Stock</label>
                    <Input name="min_stock" type="number" value={formData.min_stock} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Stock</label>
                    <Input name="max_stock" type="number" value={formData.max_stock} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" isLoading={actionLoading}>
                    {modalMode === 'add' ? 'Add Product' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IMPORT MODAL */}
      {/* ============================================================ */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Import Products from Excel</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Upload an Excel file (.xlsx) with columns: Barcode, SKU, Name, Generic Name, Brand, Category, Supplier, Unit, Cost Price, Selling Price, Current Stock, Min Stock
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {importResult && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  <p className="font-medium">{importResult.message}</p>
                  {importResult.results?.errors?.length > 0 && (
                    <ul className="mt-2 text-xs list-disc pl-4">
                      {importResult.results.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }}>Cancel</Button>
                <Button onClick={handleImport} disabled={!importFile} isLoading={actionLoading}>
                  <Upload className="h-4 w-4 mr-1" /> Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IMAGE UPLOAD MODAL */}
      {/* ============================================================ */}
      {showImageModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Product Image</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowImageModal(false); setImageFile(null); setImagePreview(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium">{selectedProduct.name}</p>

              {/* Current image */}
              {selectedProduct.image_url && (
                <div className="relative inline-block">
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="h-32 w-32 object-cover rounded-lg" />
                  <button
                    onClick={() => handleImageDelete(selectedProduct.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remove image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Preview new image */}
              {imagePreview && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">New image:</p>
                  <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border-2 border-primary" />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowImageModal(false); setImageFile(null); setImagePreview(null); }}>Cancel</Button>
                <Button onClick={handleImageUpload} disabled={!imageFile} isLoading={actionLoading}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;