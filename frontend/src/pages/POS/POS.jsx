import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Search, Barcode, ShoppingCart, Plus, Minus, Trash2, X, Printer,
  CreditCard, Banknote, Smartphone, Loader2, Package, AlertTriangle,
  Percent, ChevronDown, ChevronUp, History, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { useCategories, useProductSearch, useSales } from '@/hooks/useQueries';
import { useCreateSale, useVoidTransaction } from '@/hooks/useMutations';
import useAuthStore from '@/store/authStore';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-500' },
  { id: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'gcash', label: 'GCash', icon: Smartphone, color: 'bg-indigo-500' },
  { id: 'maya', label: 'Maya', icon: Smartphone, color: 'bg-purple-500' },
];

const formatCurrency = (value) => `₱${Number(value || 0).toFixed(2)}`;

const POS = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const searchRef = useRef(null);

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Use cached categories (24h stale time)
  const { data: categories = [] } = useCategories();

  // Use cached product search (debounced via enabled)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const { data: products = [], isFetching: searchLoading } = useProductSearch(
    debouncedSearch,
    categoryFilter,
    !!debouncedSearch
  );

  // Cart
  const [cart, setCart] = useState([]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('none');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');

  // Modals
  const [showReceipt, setShowReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  // Mutations
  const createSaleMutation = useCreateSale();
  const voidTransactionMutation = useVoidTransaction();

  // Transaction history (cached)
  const { data: transactionsData, isFetching: historyLoading, refetch: loadTransactions } = useSales(
    { limit: 50 },
    { enabled: showHistory } // Only fetch when history panel is open
  );
  const transactions = transactionsData?.items || [];

  // Barcode handler
  const handleBarcode = useCallback((e) => {
    if (e.key === 'Enter' && barcodeInput) {
      setDebouncedSearch(barcodeInput);
      setBarcodeInput('');
    }
  }, [barcodeInput]);

  // Add to cart
  const addToCart = useCallback((product) => {
    if (Number(product.current_stock) <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.current_stock)) {
          toast.error(`Only ${product.current_stock} available`);
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.selling_price),
        cost: Number(product.cost_price),
        quantity: 1,
        discount: 0,
        subtotal: Number(product.selling_price),
        stock: Number(product.current_stock),
      }];
    });
    toast.success(`${product.name} added to cart`);
  }, []);

  // Update cart quantity
  const updateQuantity = useCallback((productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > item.stock) {
        toast.error(`Only ${item.stock} available`);
        return item;
      }
      return { ...item, quantity: newQty, subtotal: newQty * item.price };
    }).filter(Boolean));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOverallDiscount(0);
    setDiscountType('none');
    setPaymentAmount('');
  }, []);

  // Memoized cart calculations
  const { subtotal, itemDiscounts, afterItemDiscounts, vat, discountAmount, total, paymentAmt, change } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const itemDisc = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    const afterItem = sub - itemDisc;
    const v = afterItem * (0.12 / 1.12);
    const discAmt = overallDiscount || 0;
    const tot = Math.max(0, afterItem - discAmt);
    const payAmt = parseFloat(paymentAmount) || 0;
    const chg = payAmt >= tot ? payAmt - tot : 0;
    return {
      subtotal: sub,
      itemDiscounts: itemDisc,
      afterItemDiscounts: afterItem,
      vat: v,
      discountAmount: discAmt,
      total: tot,
      paymentAmt: payAmt,
      change: chg,
    };
  }, [cart, overallDiscount, paymentAmount]);

  // Complete sale
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (paymentAmt < total && paymentMethod === 'cash') {
      toast.error('Insufficient payment amount');
      return;
    }

    try {
      const payload = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
          discount: item.discount || 0,
        })),
        payment_method: paymentMethod,
        payment_amount: paymentMethod === 'cash' ? paymentAmt : total,
        discount_type: discountType,
        discount_amount: discountAmount,
      };

      const res = await createSaleMutation.mutateAsync(payload);
      setReceiptItems([...cart]);
      setShowReceipt(res.data);
      clearCart();
    } catch (err) {
      // Error handled in mutation
    }
  }, [cart, paymentMethod, paymentAmt, total, discountType, discountAmount, createSaleMutation, clearCart]);

  // Void transaction
  const handleVoid = useCallback(async () => {
    if (!voidReason) { toast.error('Void reason is required'); return; }
    try {
      await voidTransactionMutation.mutateAsync({ id: showVoidDialog, data: { reason: voidReason } });
      setShowVoidDialog(null);
      setVoidReason('');
    } catch (err) {
      // Error handled in mutation
    }
  }, [voidReason, showVoidDialog, voidTransactionMutation]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
    if (e.key === 'F2') { e.preventDefault(); handleCheckout(); }
    if (e.key === 'F3') { e.preventDefault(); clearCart(); }
    if (e.key === 'Escape') { setShowReceipt(null); setShowVoidDialog(null); }
  }, [handleCheckout, clearCart]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Point of Sale</h1>
          <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">F1: Search | F2: Checkout | F3: Clear | Esc: Close</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="flex-shrink-0">
          <History className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{showHistory ? 'Hide' : 'History'}</span>
        </Button>
      </div>

      {/* Desktop/tablet: 3-col. Mobile: stacked vertical with sticky checkout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:h-[calc(100vh-12rem)]">
        {/* Left Panel - Products */}
        <div className="xl:col-span-2 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Search Bar */}
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchRef}
                    placeholder="Scan barcode and press Enter..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcode}
                    className="pl-9 font-mono"
                  />
                </div>
                <div className="relative flex-1 sm:flex-[2]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); }} className="sm:w-36">
                  <option value="">All</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto xl:min-h-0 max-xl:max-h-[50vh]">
            {searchLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center p-4">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Search for products to add</p>
                  <p className="text-xs mt-1">Scan barcode or type product name</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 p-1">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={Number(product.current_stock) <= 0}
                    className="bg-white rounded-lg border p-3 text-left hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    <div className="text-xs text-gray-400 font-mono mb-1 truncate">{product.barcode || product.sku || '—'}</div>
                    <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</div>
                    <div className="text-base sm:text-lg font-bold text-primary mt-1">{formatCurrency(product.selling_price)}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{product.current_stock} in stock</span>
                      {Number(product.current_stock) <= 0 ? (
                        <Badge variant="destructive" size="sm">OOS</Badge>
                      ) : Number(product.current_stock) <= Number(product.min_stock) ? (
                        <Badge variant="warning" size="sm">Low</Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Cart Items */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Cart ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Cart is empty</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product_id} className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
                        </div>
                        <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 rounded hover:bg-gray-200">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 rounded hover:bg-gray-200">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                          {item.discount > 0 && <p className="text-xs text-red-500">-{formatCurrency(item.discount)}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary & Payment */}
          <Card className="flex-shrink-0">
            <CardContent className="p-4 space-y-3">
              {/* Summary */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {itemDiscounts > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Item Discounts</span><span>-{formatCurrency(itemDiscounts)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>VAT (12%)</span><span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Discount:</span>
                  <Input type="number" value={overallDiscount} onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)} className="w-24 h-8 text-sm" min="0" />
                  <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="w-24 h-8 text-sm">
                    <option value="none">None</option>
                    <option value="senior">Senior</option>
                    <option value="pwd">PWD</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL</span><span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Payment Method</p>
                <div className="grid grid-cols-4 gap-1">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-2 rounded-lg text-center text-xs transition-colors ${paymentMethod === method.id ? `${method.color} text-white` : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <method.icon className="h-5 w-5 mx-auto mb-1" />
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Payment */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount Tendered</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {paymentAmt > 0 && (
                    <div className="flex justify-between mt-1 text-sm">
                      <span className="text-gray-500">Change:</span>
                      <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(change))} {change < 0 ? '(short)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0 || (paymentMethod === 'cash' && paymentAmt < total) || createSaleMutation.isPending}
                isLoading={createSaleMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createSaleMutation.isPending ? 'Processing...' : `Complete Sale (${formatCurrency(total)})`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center" id="receipt-content">
              <h2 className="text-lg font-bold mb-1">PGPOS Store</h2>
              <p className="text-xs text-gray-500 mb-4">Receipt: {showReceipt.receipt_number}</p>
              <div className="border-t border-b py-3 mb-3 space-y-1">
                {receiptItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-left flex-1">{item.name} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(showReceipt.subtotal)}</span></div>
                <div className="flex justify-between"><span>VAT</span><span>{formatCurrency(showReceipt.vat)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(showReceipt.total)}</span></div>
                <div className="flex justify-between"><span>Payment ({String(showReceipt.payment_method || paymentMethod).toUpperCase()})</span><span>{formatCurrency(showReceipt.payment_amount || showReceipt.total)}</span></div>
                <div className="flex justify-between text-green-600"><span>Change</span><span>{formatCurrency(showReceipt.change_amount)}</span></div>
              </div>
              <p className="text-xs text-gray-400">Thank you for your purchase!</p>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => window.print()} className="flex-1">
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button onClick={() => { setShowReceipt(null); }} className="flex-1">
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowHistory(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Transaction History</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><History className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No transactions</p></div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs">{tx.receipt_number}</p>
                          <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(tx.total)}</p>
                          <Badge variant={tx.status === 'voided' ? 'destructive' : 'success'} size="sm">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && tx.status !== 'voided' && (
                        <button onClick={() => setShowVoidDialog(tx.id)} className="text-xs text-red-500 hover:text-red-700 mt-2">
                          Void Transaction
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Dialog */}
      {showVoidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Void Transaction</h2>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to void this transaction? This action cannot be undone.</p>
            <textarea
              placeholder="Reason for voiding..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowVoidDialog(null); setVoidReason(''); }}>Cancel</Button>
              <Button onClick={handleVoid} disabled={!voidReason} className="bg-red-600 hover:bg-red-700">
                Confirm Void
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;