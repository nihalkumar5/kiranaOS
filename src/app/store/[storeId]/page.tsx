'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Logo from '@/components/Logo';
import axios from 'axios';
import {
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  Search,
  AlertTriangle,
  ChevronRight,
  Clock,
  ArrowLeft,
  ChevronDown,
  User,
  MapPin
} from 'lucide-react';

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  sellingPrice: string;
  unit: string;
  brand: string | null;
  image: string | null;
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PublicStorePage({ params }: { params: any }) {
  const [storeId, setStoreId] = useState<string>('');
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);

  // Cart
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Checkout inputs
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH_ON_PICKUP'>('CASH_ON_PICKUP');

  // Flow control
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Unwrap route params
  useEffect(() => {
    if (params) {
      if (typeof params.then === 'function') {
        params.then((unwrapped: any) => setStoreId(unwrapped.storeId));
      } else {
        setStoreId(params.storeId);
      }
    }
  }, [params]);

  // Load public products
  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const [productsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/store/${storeId}/products`),
        axios.get(`${API_URL}/settings/public/${storeId}`).catch(() => ({ data: { data: null } }))
      ]);
      setProducts(productsRes.data.data);
      setStoreSettings(settingsRes.data.data);
    } catch (e: any) {
      setError('Store not found or currently offline');
    } finally {
      setLoading(false);
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      if (existing) {
        return {
          ...prev,
          [product.id]: { ...existing, quantity: existing.quantity + 1 },
        };
      } else {
        return {
          ...prev,
          [product.id]: { product, quantity: 1 },
        };
      }
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setCart((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: qty },
    }));
  };

  // Calculations
  const totals = useMemo(() => {
    let total = 0;
    let itemCount = 0;
    Object.values(cart).forEach((item) => {
      total += Number(item.product.sellingPrice) * item.quantity;
      itemCount += item.quantity;
    });
    return { total, itemCount };
  }, [cart]);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totals.itemCount === 0 || !mobile || !name) return;

    setSubmitting(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const payload = {
        customerMobile: mobile,
        customerName: name,
        paymentMode,
        items: Object.values(cart).map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await axios.post(`${API_URL}/store/${storeId}/orders`, payload);
      setOrderSuccess(res.data.data);
      setCart({});
      setShowCartModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group products by category
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const catName = p.category?.name || 'Daily Essentials';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    });
    return Array.from(map.entries());
  }, [filteredProducts]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }



  if (error && products.length === 0) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Oops! Store Offline</h3>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full text-sm font-semibold transition-colors shadow-sm"
        >
          Try Reloading
        </button>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex-1 min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden text-center">
          <div className="p-8" style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : { backgroundColor: '#059669' }}>
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle 
                className="w-10 h-10" 
                style={storeSettings?.themeColor ? { color: storeSettings.themeColor } : { color: '#059669' }} 
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 mb-6">Your items are being packed.</p>
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-full text-sm transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans pb-24">
      
      {/* Fixed Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {storeSettings?.logoUrl ? (
              <img src={storeSettings.logoUrl} alt="Store Logo" className="h-8 object-contain" />
            ) : (
              <div className="bg-[#059669] text-white p-1.5 rounded-lg" style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : {}}>
                <ShoppingCart className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{storeSettings?.name || 'Local Store'}</h1>
              {storeSettings?.tagline && <p className="text-[10px] text-gray-500 hidden sm:block">{storeSettings.tagline}</p>}
            </div>
          </div>
          
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100/50 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:border-transparent transition-all"
                style={storeSettings?.themeColor ? { '--tw-ring-color': storeSettings.themeColor } as any : { '--tw-ring-color': '#059669' } as any}
              />
            </div>
          </div>

          <button
              onClick={() => setShowCartModal(true)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {totals.itemCount > 0 && (
                <span 
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white rounded-full border-2 border-white"
                  style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : { backgroundColor: '#059669' }}
                >
                  {totals.itemCount}
                </span>
              )}
            </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 min-h-[70vh]">
        
        {/* Dynamic Banner */}
        {storeSettings?.bannerUrl && !searchQuery && (
          <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative">
            <img src={storeSettings.bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:p-8">
              <div className="text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-1">{storeSettings.name}</h2>
                {storeSettings.description && <p className="text-sm opacity-90 max-w-xl">{storeSettings.description}</p>}
              </div>
            </div>
          </div>
        )}

        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Search results for "{searchQuery}"
            </h2>
            <p className="text-sm text-gray-500">{filteredProducts.length} items found</p>
          </div>
        )}

        {/* 3. Search by Category */}
        {!searchQuery && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Search by Category</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {[
                {name: 'Groceries', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&h=150&fit=crop'},
                {name: 'Fish', img: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=150&h=150&fit=crop'},
                {name: 'Meat', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=150&h=150&fit=crop'},
                {name: 'Vegetables', img: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=150&h=150&fit=crop'},
                {name: 'Fruits', img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=150&h=150&fit=crop'},
                {name: 'Ice Cream', img: 'https://images.unsplash.com/photo-1570197781417-06399120cecb?w=150&h=150&fit=crop'},
              ].map((cat, i) => (
                <div 
                  key={i} 
                  className="snap-start shrink-0 flex flex-col items-center justify-center bg-white border border-gray-100 w-32 h-36 rounded-2xl cursor-pointer hover:border-green-200 hover:shadow-[0_8px_20px_rgb(59,183,126,0.12)] transition-all group"
                >
                  <img src={cat.img} alt={cat.name} className="w-14 h-14 object-cover rounded-full mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-[13px] font-bold text-gray-700">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Horizontal Product Scrollers by Category */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No items found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-10">
            {productsByCategory.map(([categoryName, catProducts]) => (
              <div key={categoryName} className="flex flex-col">
                <div className="flex justify-between items-end mb-4 pr-2">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{categoryName}</h2>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                  {catProducts.map((p) => {
                    const qty = cart[p.id]?.quantity || 0;
                    return (
                      <div
                        key={p.id}
                        className="w-[150px] md:w-[180px] flex-shrink-0 bg-white border border-gray-100 rounded-3xl flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 snap-start relative overflow-hidden group p-1"
                      >
                        <div className="h-[130px] md:h-[150px] w-full p-4 flex items-center justify-center relative bg-gray-50/50 rounded-2xl mb-2">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="object-contain w-full h-full mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                          ) : (
                            <ShoppingCart className="w-8 h-8 text-gray-200" />
                          )}
                        </div>

                        <div className="p-2 flex-1 flex flex-col">
                          <h4 className="font-semibold text-gray-900 text-[13px] leading-snug line-clamp-2 min-h-[36px]">{p.name}</h4>
                          <p className="text-[11px] text-gray-500 mt-1 mb-3">{p.unit}</p>

                          <div className="flex items-center justify-between gap-1 mt-auto">
                            <span className="font-bold text-[14px] md:text-[15px] text-gray-900 leading-none">
                              ₹{Number(p.sellingPrice).toFixed(0)}
                            </span>

                            <div 
                              className={`absolute right-3 -bottom-3 w-10 h-[72px] rounded-xl shadow-lg border border-white/50 overflow-hidden backdrop-blur-sm transition-all z-10 ${
                                qty > 0 ? 'scale-105' : 'hover:scale-105 hover:shadow-xl'
                              }`}
                              style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : { backgroundColor: '#059669' }}
                            >
                              {qty > 0 ? (
                                <div className="flex flex-col h-full items-center justify-between py-1">
                                  <button
                                    onClick={() => updateQuantity(p.id, qty + 1)}
                                    className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <span className="text-white font-bold text-sm">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(p.id, qty - 1)}
                                    className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(p)}
                                  className="w-full h-full flex flex-col items-center justify-center text-white/90 hover:text-white transition-colors"
                                >
                                  <Plus className="w-5 h-5 mb-0.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Add
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart (Mobile only) */}
      {totals.itemCount > 0 && !showCartModal && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgb(0,0,0,0.05)] md:hidden">
          <button
            onClick={() => setShowCartModal(true)}
            className="w-full text-white shadow-xl shadow-black/10 rounded-2xl px-5 py-4 flex items-center justify-between"
            style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : { backgroundColor: '#059669' }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Your Cart</p>
                <p className="font-bold text-white leading-none mt-1">
                  {totals.itemCount} item{totals.itemCount !== 1 && 's'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Total</p>
                <p className="font-bold text-white leading-none mt-1">₹{totals.total}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </button>
        </div>
      )}

      {/* Fullscreen Cart & Checkout Modal (Mobile + Desktop) */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col md:flex-row md:items-stretch md:justify-end animate-in fade-in duration-200">
          
          {/* Mobile Header */}
          <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10 md:hidden rounded-t-2xl mt-4">
            <button 
              onClick={() => setShowCartModal(false)}
              className="p-1 -ml-1 text-gray-700"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Checkout</h2>
          </div>
          
          {/* Desktop Close Overlay */}
          <div className="hidden md:block flex-1 cursor-pointer" onClick={() => setShowCartModal(false)}></div>

          {/* Cart Container (Drawer style) */}
          <div className="w-full md:max-w-[440px] bg-gray-50 relative z-10 flex flex-col overflow-y-auto md:shadow-2xl">
            
            {/* Desktop Header inside cart */}
            <div className="bg-white px-6 py-5 hidden md:flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">My Cart</h2>
              <button onClick={() => setShowCartModal(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 pb-32">
              
              {/* Delivery info */}
              <div className="bg-white rounded-2xl p-5 flex gap-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100">
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-extrabold text-[15px] text-gray-900 leading-tight">Delivery in 11 minutes</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Shipment of {totals.itemCount} items</p>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100">
                <div className="space-y-6">
                  {Object.values(cart).map((item) => (
                    <div key={item.product.id} className="flex gap-4">
                      <div className="w-[64px] h-[64px] bg-gray-50 rounded-xl flex items-center justify-center p-2 border border-gray-100">
                        {item.product.image ? (
                          <img src={item.product.image} className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                          <ShoppingCart className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h5 className="font-semibold text-[14px] text-gray-900 line-clamp-1">{item.product.name}</h5>
                        <span className="text-[12px] text-gray-500 mt-0.5">{item.product.unit}</span>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-[15px] text-gray-900">₹{Number(item.product.sellingPrice).toFixed(0)}</span>
                          
                          <div className="flex items-center bg-gray-100 text-gray-900 rounded-full overflow-hidden text-sm font-bold h-8 w-[72px]">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex-1 flex justify-center items-center h-full hover:bg-gray-200 transition-colors">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="flex-1 text-center select-none text-[13px]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex-1 flex justify-center items-center h-full hover:bg-gray-200 transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Details */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100">
                <h3 className="font-bold text-gray-900 text-[15px] mb-4">Bill Details</h3>
                <div className="space-y-3 text-[14px]">
                  <div className="flex justify-between text-gray-500">
                    <span>Item total</span>
                    <span className="text-gray-900">₹{totals.total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Handling charge</span>
                    <span className="line-through text-gray-300">₹4</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-900 text-[16px] pt-4 border-t border-gray-100">
                    <span>Grand total</span>
                    <span>₹{totals.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout form */}
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-[15px]">Pickup Details</h3>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="w-full bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-gray-400 transition-colors" />
                <input type="tel" required maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="Mobile Number" className="w-full bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-gray-400 transition-colors" />
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentMode('UPI')} className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${paymentMode === 'UPI' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>UPI App</button>
                    <button type="button" onClick={() => setPaymentMode('CASH_ON_PICKUP')} className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${paymentMode === 'CASH_ON_PICKUP' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>Cash</button>
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Checkout Button */}
            <div className="bg-white border-t border-gray-100 p-4 md:p-6 absolute bottom-0 left-0 right-0 shadow-[0_-4px_20px_rgb(0,0,0,0.08)] z-20">
              {error && <div className="mb-3 text-xs font-bold text-red-500 text-center">{error}</div>}
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || !mobile || !name || totals.itemCount === 0}
                className="w-full text-white font-bold py-4 rounded-full text-[15px] transition-all flex items-center justify-between px-6 shadow-md shadow-black/10 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                style={storeSettings?.themeColor ? { backgroundColor: storeSettings.themeColor } : { backgroundColor: '#10b981' }}
              >
                <span>₹{totals.total.toFixed(0)}</span>
                <span className="flex items-center gap-1">
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Place Order <ChevronRight className="w-5 h-5" /></>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
