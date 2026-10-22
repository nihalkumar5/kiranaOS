'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Plus,
  History,
  Search,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  Camera,
  Image as ImageIcon,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle,
  X,
  ArrowRight,
  Filter,
  Package,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  image: string | null;
  categoryId: string | null;
  category?: Category | null;
  purchasePrice: string | number;
  sellingPrice: string | number;
  stock: string | number;
  unit: string;
  brand: string | null;
  gst: string | number;
}

interface InventoryLog {
  id: string;
  type: 'PURCHASE' | 'SALE' | 'AUDIT_ADJUSTMENT' | 'RETURN';
  quantity: string | number;
  beforeStock: string | number;
  afterStock: string | number;
  description: string | null;
  createdAt: string;
  product: {
    name: string;
    barcode: string | null;
    unit: string;
  };
  user: {
    name: string;
  };
}

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Add/Edit Product Form state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodPurchasePrice, setProdPurchasePrice] = useState('');
  const [prodSellingPrice, setProdSellingPrice] = useState('');
  const [prodStock, setProdStock] = useState('0');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodGst, setProdGst] = useState('0');
  const [prodImage, setProdImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restock / Audit forms state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [actualStock, setActualStock] = useState('');
  const [auditReason, setAuditReason] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchInventoryData();
    }
  }, [user]);

  // Voice AI auto-update listener
  useEffect(() => {
    const handleVoiceUpdate = () => {
      fetchInventoryData();
    };
    window.addEventListener('kiranaos:product-updated', handleVoiceUpdate);
    return () => window.removeEventListener('kiranaos:product-updated', handleVoiceUpdate);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function fetchInventoryData() {
    setLoading(true);
    try {
      const [prodRes, logRes, lowRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory/history'),
        api.get('/inventory/low-stock'),
        api.get('/categories'),
      ]);

      setProducts(prodRes.data.data || []);
      setLogs(logRes.data.data || []);
      setLowStock(lowRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (e) {
      console.error('Failed to load inventory data', e);
      showToast('Data load nahi ho paya, please refresh', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Handle Image Upload with Client-Side Compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setProdImage(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Add or Edit Product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodSellingPrice) {
      showToast('Product name aur selling price zaroori hai', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: prodName.trim(),
        barcode: prodBarcode.trim() || undefined,
        brand: prodBrand.trim() || undefined,
        categoryId: prodCategoryId || undefined,
        purchasePrice: prodPurchasePrice ? Number(prodPurchasePrice) : 0,
        sellingPrice: Number(prodSellingPrice),
        stock: prodStock ? Number(prodStock) : 0,
        unit: prodUnit,
        gst: prodGst ? Number(prodGst) : 0,
        image: prodImage || undefined,
      };

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        showToast('Product update ho gaya!', 'success');
      } else {
        await api.post('/products', payload);
        showToast('Naya product dukaan me jud gaya!', 'success');
      }

      setShowAddProductModal(false);
      clearProductForm();
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error aa raha hai, check karein', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdBarcode(p.barcode || '');
    setProdBrand(p.brand || '');
    setProdCategoryId(p.categoryId || '');
    setProdPurchasePrice(p.purchasePrice ? String(p.purchasePrice) : '');
    setProdSellingPrice(String(p.sellingPrice));
    setProdStock(String(p.stock));
    setProdUnit(p.unit || 'pcs');
    setProdGst(p.gst ? String(p.gst) : '0');
    setProdImage(p.image || null);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Kya aap sach me "${name}" ko delete karna chahte hain?`)) return;

    try {
      await api.delete(`/products/${id}`);
      showToast(`${name} delete ho gaya`, 'success');
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete nahi ho paya', 'error');
    }
  };

  const clearProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdBarcode('');
    setProdBrand('');
    setProdCategoryId('');
    setProdPurchasePrice('');
    setProdSellingPrice('');
    setProdStock('0');
    setProdUnit('pcs');
    setProdGst('0');
    setProdImage(null);
  };

  // Submit Restock Purchase
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !purchaseQty) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/purchase', {
        productId: selectedProductId,
        quantity: Number(purchaseQty),
        purchasePrice: newPurchasePrice ? Number(newPurchasePrice) : undefined,
      });

      showToast('Stock safely add ho gaya!', 'success');
      setShowPurchaseModal(false);
      clearRestockForm();
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error aa raha hai', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Audit override
  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !actualStock) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/audit', {
        productId: selectedProductId,
        actualStock: Number(actualStock),
        reason: auditReason || undefined,
      });

      showToast('Stock audit update ho gaya!', 'success');
      setShowAuditModal(false);
      clearRestockForm();
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error aa raha hai', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clearRestockForm = () => {
    setSelectedProductId('');
    setPurchaseQty('');
    setNewPurchasePrice('');
    setActualStock('');
    setAuditReason('');
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery)) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;

      return matchesQuery && matchesCat;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  // Derived stats
  const stats = useMemo(() => {
    let totalStockItems = 0;
    let totalStockValue = 0;
    let totalSalesValue = 0;

    products.forEach((p) => {
      const stockVal = Number(p.stock);
      const buyPrice = Number(p.purchasePrice);
      const sellPrice = Number(p.sellingPrice);

      totalStockItems += stockVal;
      totalStockValue += buyPrice * stockVal;
      totalSalesValue += sellPrice * stockVal;
    });

    return {
      totalStockItems,
      totalStockValue,
      potentialProfit: totalSalesValue - totalStockValue,
    };
  }, [products]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl border text-xs font-black shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 ${
            toast.type === 'success'
              ? 'bg-slate-950 text-white border-emerald-500/50'
              : 'bg-rose-950 text-white border-rose-500/50'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-12">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 m-0 tracking-tight">
                Products & Inventory
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {products.length} SKUs
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Manage product catalog, real-time stock, margins, barcodes and batch Excel import.
            </p>
          </div>

          {/* Action Button Cluster */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { clearProductForm(); setShowAddProductModal(true); }}
              className="flex items-center gap-2 bg-[#059669] hover:bg-emerald-700 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>

            <label className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer shadow-2xs transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  try {
                    const XLSX = await import('xlsx');
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const data = new Uint8Array(event.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                        const mapped = json.map((row) => ({
                          name: row['Item Name'] || row['Product Name'] || row['name'] || '',
                          barcode: row['Barcode'] || row['barcode'] ? String(row['Barcode'] || row['barcode']) : undefined,
                          purchasePrice: Number(row['Cost Price'] || row['Purchase Price'] || row['purchasePrice'] || 0),
                          sellingPrice: Number(row['Selling Price'] || row['MRP'] || row['sellingPrice'] || 0),
                          stock: Number(row['Current Stock'] || row['Stock'] || row['stock'] || 0),
                          unit: row['Unit'] || row['unit'] || 'pcs',
                          brand: row['Brand'] || row['brand'] || undefined,
                        })).filter((r) => r.name && r.sellingPrice > 0);

                        if (mapped.length === 0) {
                          showToast('Excel file me koi valid product data nahi mila', 'error');
                          setLoading(false);
                          return;
                        }

                        await api.post('/products/bulk', { products: mapped });
                        showToast(`${mapped.length} products successfully import ho gaye!`, 'success');
                        fetchInventoryData();
                      } catch (err: any) {
                        showToast(err.response?.data?.message || 'Import fail ho gaya', 'error');
                      } finally {
                        setLoading(false);
                      }
                    };
                    reader.readAsArrayBuffer(file);
                  } catch (err) {
                    showToast('Failed to load excel parser', 'error');
                    setLoading(false);
                  }
                  e.target.value = '';
                }}
              />
            </label>

            <button
              onClick={() => { clearRestockForm(); setShowPurchaseModal(true); }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition-colors"
            >
              <Boxes className="w-4 h-4 text-emerald-400" />
              <span>Stock In</span>
            </button>

            <button
              onClick={() => { clearRestockForm(); setShowAuditModal(true); }}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition-colors"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Audit Fix</span>
            </button>
          </div>
        </header>

        {/* Body Content */}
        <div className="px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ─── TOP KPI STAT ROW ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Stock Value */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Total Inventory Value
                </span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums mt-1 m-0">
                  ₹{stats.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-slate-400 font-medium m-0 mt-1">
                  Potential Profit: +₹{stats.potentialProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                  Low Stock Warnings
                </span>
                <p className="text-2xl sm:text-3xl font-black text-rose-900 tracking-tight tabular-nums mt-1 m-0">
                  {lowStock.length} Item{lowStock.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-rose-600 font-semibold m-0 mt-1">
                  Remaining ≤ 5 units in store
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Total Active SKUs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Active Store SKUs
                </span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums mt-1 m-0">
                  {products.length} Products
                </p>
                <p className="text-xs text-slate-400 font-medium m-0 mt-1">
                  {stats.totalStockItems.toFixed(0)} total units across shelves
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ─── SEARCH & CATEGORY PILL FILTER BAR ─── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, brand, or barcode [F2]..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Category Dropdown (Mobile) */}
              <div className="sm:hidden">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Category Filter Pills */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-slate-900 text-white font-black shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((c) => {
                const count = products.filter((p) => p.categoryId === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      selectedCategoryFilter === c.id
                        ? 'bg-slate-900 text-white font-black shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── DATA TABLE & STOCK MOVEMENT SPLIT ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Products Table (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Catalog List ({filteredProducts.length} Showing)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Item Details</th>
                      <th className="py-3 px-3 text-right">Cost Price</th>
                      <th className="py-3 px-3 text-right">Selling Price</th>
                      <th className="py-3 px-3 text-right">Margin</th>
                      <th className="py-3 px-3 text-right">Stock</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                          Loading products catalog...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                          Koi item nahi mila. Naya item add karein.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const stockNum = Number(p.stock);
                        const isLow = stockNum <= 5;
                        const buyPrice = Number(p.purchasePrice || 0);
                        const sellPrice = Number(p.sellingPrice);
                        const marginAmt = sellPrice - buyPrice;
                        const marginPct = buyPrice > 0 ? Math.round((marginAmt / buyPrice) * 100) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                            {/* Product */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-900 truncate m-0 text-xs">
                                    {p.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {p.brand && (
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {p.brand}
                                      </span>
                                    )}
                                    {p.barcode && (
                                      <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                        {p.barcode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cost */}
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-500">
                              ₹{buyPrice.toFixed(0)}
                            </td>

                            {/* Selling */}
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                              ₹{sellPrice.toFixed(0)}
                            </td>

                            {/* Margin Badge */}
                            <td className="py-3 px-3 text-right font-mono">
                              {marginPct > 0 ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  +{marginPct}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">-</span>
                              )}
                            </td>

                            {/* Stock */}
                            <td className="py-3 px-3 text-right font-mono">
                              <span
                                className={`font-black px-2 py-0.5 rounded-lg text-xs inline-block ${
                                  isLow
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'text-slate-900'
                                }`}
                              >
                                {stockNum.toFixed(0)} {p.unit}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleEditProduct(p)}
                                  title="Edit Product"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  title="Delete Product"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock Movement History (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-black text-slate-900 m-0">Stock Log (Khata)</h2>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Audit Feed
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs">
                      Koi transaction history nahi hai.
                    </div>
                  ) : (
                    logs.slice(0, 15).map((log) => {
                      const qtyVal = Number(log.quantity);
                      const isPositive = qtyVal > 0;
                      return (
                        <div
                          key={log.id}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate m-0">
                                {log.product?.name || 'Item'}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} • {log.type}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                                isPositive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPositive ? '+' : ''}{qtyVal.toFixed(0)}
                            </span>
                          </div>
                          <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                            <span>Before: {Number(log.beforeStock)}</span>
                            <span>→</span>
                            <span className="font-bold text-slate-900">After: {Number(log.afterStock)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-medium m-0">
                  Changes auto-logged from POS checkout & voice commands.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ADD / EDIT PRODUCT MODAL ─── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 m-0">
                {editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}
              </h3>
              <button
                onClick={() => { setShowAddProductModal(false); clearProductForm(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Picker */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden transition-colors shrink-0"
                  >
                    {prodImage ? (
                      <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span className="text-[9px] text-slate-500 mt-1">Photo</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={prodImage || ''}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="Or paste image web URL..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                    {prodImage && (
                      <button
                        type="button"
                        onClick={() => setProdImage(null)}
                        className="text-[11px] text-rose-600 font-bold mt-1"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Fortune Kachi Ghani Oil 1L"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              {/* Barcode & Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    placeholder="Scan / type barcode"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    placeholder="e.g. Amul, Nestle"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Cost Price (₹ Buy)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodPurchasePrice}
                    onChange={(e) => setProdPurchasePrice(e.target.value)}
                    placeholder="₹ 0.00"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Selling MRP (₹ Sell) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    placeholder="₹ 0.00"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Unit
                  </label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                  >
                    <option value="pcs">Pcs (Piece)</option>
                    <option value="kg">Kg (Kilogram)</option>
                    <option value="packet">Packet</option>
                    <option value="l">Ltr (Litre)</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddProductModal(false); clearProductForm(); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : editingProductId ? 'Update Product' : 'Add to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESTOCK MODAL ─── */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 m-0">📦 Stock Restock (Maal Aaya)</h3>
              <button
                onClick={() => { setShowPurchaseModal(false); clearRestockForm(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Quantity In *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Cost Rate (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    placeholder="₹ New cost"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowPurchaseModal(false); clearRestockForm(); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── STOCK AUDIT MODAL ─── */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 m-0">🔍 Stock Audit Fix (Physical Count)</h3>
              <button
                onClick={() => { setShowAuditModal(false); clearRestockForm(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Computer: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Real Shelf Count *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  placeholder="Asal dukaan me kitna piece bacha hai?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Reason for Difference
                </label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g. Damage, expiry, theft, packaging tear"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAuditModal(false); clearRestockForm(); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Set Accurate Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
