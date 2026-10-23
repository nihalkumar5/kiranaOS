'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  MapPin,
  Phone,
  ShieldCheck,
  Zap,
  Sparkles,
  Bike,
  Tag,
  Check,
  Store,
  Trash2,
} from 'lucide-react';
import { playSuccessSound } from '@/lib/sounds';

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  sellingPrice: string;
  purchasePrice?: string;
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

const CATEGORY_ICONS: Record<string, string> = {
  milk: '🥛',
  dairy: '🥛',
  doodh: '🥛',
  atta: '🌾',
  flour: '🌾',
  rice: '🍚',
  dal: '🍲',
  oil: '🧈',
  ghee: '🧈',
  snack: '🍿',
  snacks: '🍿',
  biscuit: '🍪',
  tea: '☕',
  chai: '☕',
  drink: '🥤',
  juice: '🧃',
  soap: '🧼',
  shampoo: '🧴',
  hair: '🧴',
  toothpaste: '🪥',
  cleaning: '🧹',
  detergent: '🧺',
  spice: '🌶️',
  spices: '🌶️',
  masala: '🌶️',
  sauce: '🥫',
  food: '🍱',
  general: '🛒',
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📦';
}

export default function PublicStorePage({ params }: { params: any }) {
  const [storeId, setStoreId] = useState<string>('');
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCartModal, setShowCartModal] = useState(false);

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Checkout inputs
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH_ON_PICKUP' | 'UPI'>('CASH_ON_PICKUP');

  // Order submission
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params safely
  useEffect(() => {
    if (params) {
      if (typeof params.then === 'function') {
        params.then((res: any) => setStoreId(res.storeId));
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
      const res = await axios.get(`/api/stores/${storeId}`);
      if (res.data?.success && res.data?.data) {
        const store = res.data.data;
        setStoreSettings(store);
        setProducts(store.products || []);
      } else {
        setError('Store not found or currently offline');
      }
    } catch (e: any) {
      setError('Store not found or currently offline');
    } finally {
      setLoading(false);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    playSuccessSound();
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
    playSuccessSound();
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

  // Cart calculations
  const totals = useMemo(() => {
    let total = 0;
    let itemCount = 0;
    let totalSavings = 0;

    Object.values(cart).forEach((item) => {
      const sp = Number(item.product.sellingPrice);
      const mrp = Number(item.product.purchasePrice || 0) > sp
        ? Number(item.product.purchasePrice)
        : Math.ceil((sp * 1.15) / 5) * 5;

      total += sp * item.quantity;
      itemCount += item.quantity;
      totalSavings += Math.max(0, mrp - sp) * item.quantity;
    });

    return { total, itemCount, totalSavings };
  }, [cart]);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totals.itemCount === 0 || !mobile || !name) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        storeId,
        customerMobile: mobile.trim(),
        customerName: name.trim(),
        paymentMode,
        address: address.trim() || undefined,
        items: Object.values(cart).map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: parseFloat(item.product.sellingPrice),
        })),
      };

      const res = await axios.post('/api/online-orders', payload);
      setOrderSuccess(res.data.data);
      setCart({});
      setShowCartModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      const catName = p.category?.name || 'General';
      return catName.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [products, searchQuery, selectedCategory]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach((p) => {
      const catName = p.category?.name || 'General Items';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    });
    return Array.from(map.entries());
  }, [filteredProducts]);

  // Unique categories for navigation chips
  const categoryChips = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set);
  }, [products]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
        <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-[#0C831F] rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Storefront...</p>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Store Currently Offline</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-5 bg-[#0C831F] hover:bg-[#0a6d1a] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // ─── ORDER SUCCESS CONFIRMATION SCREEN ───
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full overflow-hidden text-center"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0C831F] to-emerald-700 p-8 text-white">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-[#0C831F]">
              <CheckCircle className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-black">Order Placed Successfully!</h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">
              Order #{orderSuccess.id?.slice(0, 8).toUpperCase() || 'KOS-NEW'}
            </p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4 text-left">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0C831F] text-white flex items-center justify-center shrink-0">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-900">Estimated Delivery: 15–20 Mins</p>
                <p className="text-[11px] text-emerald-700">The store is packing your fresh items right now.</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Store:</span>
                <span className="font-bold text-slate-900">{storeSettings?.name}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Customer:</span>
                <span className="font-bold text-slate-900">{orderSuccess.customer?.name || name}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-700 uppercase">
                  {orderSuccess.paymentMode?.replace('_', ' ') || 'Cash on Delivery'}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-100">
                <span>Total Amount:</span>
                <span className="font-mono text-base text-[#0C831F]">
                  ₹{Number(orderSuccess.totalAmount || totals.total).toFixed(0)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer shadow-md"
            >
              Back to Storefront
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f4f6f8] min-h-screen font-sans selection:bg-[#0C831F] selection:text-white">
      {/* ─── QUICK COMMERCE TOP HEADER (BLINKIT STYLE) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Store Identity & Delivery Promise */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0C831F] to-emerald-700 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                  {storeSettings?.name || 'Local Grocery Store'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 truncate flex items-center gap-1">
                  <span className="text-[#0C831F] font-black">⚡ 10–15 Mins</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 hidden sm:inline">Instant Home Delivery</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search Omnibox */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0C831F]/20 focus-within:border-[#0C831F] rounded-2xl border border-slate-200/80 transition-all">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search 'milk', 'atta', 'oil', 'chips'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-10 pr-9 py-2.5 text-xs sm:text-[13px] text-slate-900 placeholder-slate-400 font-medium outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Cart Button */}
          <div className="shrink-0">
            <button
              onClick={() => setShowCartModal(true)}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl bg-[#0C831F] hover:bg-[#0a6d1a] active:scale-95 text-white font-black text-xs shadow-md shadow-green-950/20 transition-all cursor-pointer select-none"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <div className="hidden sm:flex items-center gap-1.5 leading-tight">
                <span>Cart</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded-md font-mono text-[11px]">
                  {totals.itemCount}
                </span>
              </div>
              <span className="sm:hidden font-mono font-bold">{totals.itemCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── DELIVERY TRUST & VALUE STRIP ─── */}
      <div className="bg-gradient-to-r from-emerald-600 via-[#0C831F] to-teal-700 text-white px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-bold overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Bike className="w-4 h-4 text-amber-300" />
            <span>⚡ Superfast Free Delivery on orders over ₹199</span>
          </div>
          <div className="hidden md:flex items-center gap-6 shrink-0 text-emerald-100 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 100% Genuine Local Store Products
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Direct Delivery from {storeSettings?.name}
            </span>
          </div>
        </div>
      </div>

      {/* ─── HORIZONTAL CATEGORY NAVIGATION BAR ─── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 overflow-x-auto hide-scrollbar flex items-center gap-2">
          {/* All Items Chip */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>All Items</span>
            <span className="text-[10px] opacity-70">({products.length})</span>
          </button>

          {/* Dynamic Category Chips */}
          {categoryChips.map((catName) => {
            const isActive = selectedCategory.toLowerCase() === catName.toLowerCase();
            const icon = getCategoryIcon(catName);
            return (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0C831F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{icon}</span>
                <span>{catName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN PRODUCT CATALOG FEED ─── */}
      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-7 flex-1 pb-32">
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black text-slate-900">
              Search results for "{searchQuery}" ({filteredProducts.length} items)
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#0C831F] font-bold hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-slate-800">No items found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              We couldn't find anything matching "{searchQuery}". Try searching for milk, atta, oil, or chips.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 bg-[#0C831F] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Browse All Products
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {productsByCategory.map(([categoryName, catProducts]) => (
              <section key={categoryName} className="space-y-3.5">
                {/* Category Section Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(categoryName)}</span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      {categoryName}
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({catProducts.length})
                    </span>
                  </div>
                </div>

                {/* Modern Quick-Commerce Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                  {catProducts.map((p) => {
                    const inCartQty = cart[p.id]?.quantity || 0;
                    const sp = Number(p.sellingPrice);
                    const mrp = Number(p.purchasePrice || 0) > sp
                      ? Number(p.purchasePrice)
                      : Math.ceil((sp * 1.15) / 5) * 5;
                    const discount = mrp > sp ? Math.round(((mrp - sp) / mrp) * 100) : 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-[#0C831F] hover:shadow-lg transition-all duration-200 p-3 flex flex-col justify-between shadow-2xs group relative cursor-pointer select-none active:scale-[0.98]"
                      >
                        {/* Top Tag Badges */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            <Clock className="w-2.5 h-2.5 text-[#0C831F]" />
                            <span>10 MINS</span>
                          </span>

                          {discount > 0 ? (
                            <span className="text-[10px] font-black bg-[#0C831F] text-white px-1.5 py-0.5 rounded-md shadow-2xs">
                              {discount}% OFF
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              FRESH
                            </span>
                          )}
                        </div>

                        {/* Product Photo Stage */}
                        <div className="w-full h-32 my-1 flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-xl overflow-hidden p-2 border border-slate-100 group-hover:border-slate-200 transition-colors relative">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-108 transition-all duration-300 drop-shadow-xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-[#0C831F] font-black text-lg flex items-center justify-center font-mono border border-[#0C831F]/20">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="mt-1 flex-1 flex flex-col justify-end">
                          {p.brand && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate mb-0.5">
                              {p.brand}
                            </span>
                          )}
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight line-clamp-2 min-h-[30px] group-hover:text-[#0C831F] transition-colors">
                            {p.name}
                          </h4>
                          <div className="mt-1">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {p.unit || '1 unit'}
                            </span>
                          </div>
                        </div>

                        {/* Price & Action Row */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-sm sm:text-base font-mono font-black text-slate-900 leading-none">
                              ₹{sp.toFixed(0)}
                            </span>
                            {mrp > sp && (
                              <span className="text-[10px] font-mono text-slate-400 line-through mt-0.5 leading-none">
                                ₹{mrp.toFixed(0)}
                              </span>
                            )}
                          </div>

                          {/* Quick-Commerce Stepper / ADD Button */}
                          <div onClick={(e) => e.stopPropagation()}>
                            {inCartQty > 0 ? (
                              <div className="flex items-center bg-[#0C831F] text-white rounded-xl h-7 px-1 shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(p.id, inCartQty - 1);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer transition-colors active:scale-90"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-black text-xs px-2 text-white">
                                  {inCartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(p.id, inCartQty + 1);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer transition-colors active:scale-90"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p);
                                }}
                                className="px-3.5 py-1 bg-white border-2 border-[#0C831F] hover:bg-[#0C831F] hover:text-white text-[#0C831F] rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ─── STICKY BLINKIT FLOATING CART BAR ─── */}
      <AnimatePresence>
        {totals.itemCount > 0 && !showCartModal && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-3.5 right-3.5 sm:left-auto sm:right-6 sm:w-96 z-40"
          >
            <button
              onClick={() => setShowCartModal(true)}
              className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] active:scale-[0.98] text-white p-3.5 rounded-2xl shadow-2xl shadow-green-950/40 border border-emerald-400/30 flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-mono font-black text-xs shrink-0">
                  {totals.itemCount}
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-medium text-emerald-100 block leading-tight">
                    {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} in Cart
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black block leading-tight">
                    ₹{totals.total.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-xs bg-white text-[#0C831F] px-3.5 py-2 rounded-xl shadow-xs shrink-0">
                <span>View Cart</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODERN SLIDE-IN CHECKOUT DRAWER (MOBILE + DESKTOP) ─── */}
      <AnimatePresence>
        {showCartModal && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Slide-In Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute inset-y-0 right-0 max-w-full w-full sm:max-w-md bg-white shadow-2xl flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-base font-black text-slate-900">My Cart</h3>
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
                    {totals.itemCount} items
                  </span>
                </div>

                <button
                  onClick={() => setShowCartModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Delivery Time Pill */}
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0C831F] text-white flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 leading-tight">Delivery in 10–15 Minutes</h4>
                    <p className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                      Direct from {storeSettings?.name}
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Cart Items</h4>
                  {Object.values(cart).map((item) => {
                    const price = Number(item.product.sellingPrice);
                    const itemTotal = price * item.quantity;
                    return (
                      <div
                        key={item.product.id}
                        className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        {/* Image */}
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1 overflow-hidden shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                            />
                          ) : (
                            <span className="font-mono font-bold text-xs text-[#0C831F]">
                              {item.product.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Title & Unit */}
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate leading-snug">
                            {item.product.name}
                          </h5>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ₹{price.toFixed(0)} • {item.product.unit}
                          </span>
                        </div>

                        {/* Stepper & Total */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center bg-[#0C831F] text-white rounded-lg h-7 px-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black text-xs px-2 text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-mono font-black text-xs text-slate-900 min-w-[48px] text-right">
                            ₹{itemTotal.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Information Form */}
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Delivery Details</h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0C831F] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Mobile Number (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0C831F] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Delivery Address & Landmark</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Flat / House no, Street, Near landmark"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0C831F] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium outline-none transition-colors"
                    />
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('CASH_ON_PICKUP')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          paymentMode === 'CASH_ON_PICKUP'
                            ? 'border-[#0C831F] bg-emerald-50 text-[#0C831F]'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        💵 Cash on Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('UPI')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          paymentMode === 'UPI'
                            ? 'border-[#0C831F] bg-emerald-50 text-[#0C831F]'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        📲 UPI on Delivery
                      </button>
                    </div>
                  </div>
                </form>

                {/* Bill Breakdown */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-slate-800">₹{totals.total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Delivery Partner Fee</span>
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-slate-400 font-mono">₹25</span>
                      <span className="font-bold text-[#0C831F] uppercase">FREE</span>
                    </div>
                  </div>
                  {totals.totalSavings > 0 && (
                    <div className="flex justify-between text-[#0C831F] font-bold">
                      <span>Total Savings</span>
                      <span className="font-mono">₹{totals.totalSavings.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
                    <span>To Pay</span>
                    <span className="font-mono text-base text-[#0C831F]">
                      ₹{totals.total.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Action Bar */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                {error && (
                  <p className="text-xs font-bold text-rose-600 text-center mb-2">{error}</p>
                )}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting || !mobile || !name || totals.itemCount === 0}
                  className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] active:bg-[#085a15] disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-md shadow-green-950/20 transition-all flex items-center justify-between px-5 cursor-pointer"
                >
                  <span className="font-mono">₹{totals.total.toFixed(0)}</span>
                  <span className="flex items-center gap-1 tracking-wide">
                    {submitting ? 'Placing Order...' : 'Place Delivery Order'}
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
