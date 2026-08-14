'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';
import {
  Plus,
  History,
  Search,
  AlertTriangle,
  Boxes,
  DollarSign,
  LayoutDashboard,
  Zap,
  BarChart2,
  Globe,
  Camera,
  Image as ImageIcon,
  Trash2,
  Edit2
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

  // UI helpers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect non-admins or unauthenticated
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/pos');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchInventoryData();
    }
  }, [user]);

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

  // Handle Image Upload with Base64 preview
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Photo size 2MB se kam honi chahiye', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProdImage(reader.result as string);
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
        barcode: prodBarcode.trim() || null,
        brand: prodBrand.trim() || null,
        categoryId: prodCategoryId || null,
        purchasePrice: parseFloat(prodPurchasePrice || '0'),
        sellingPrice: parseFloat(prodSellingPrice || '0'),
        stock: parseFloat(prodStock || '0'),
        unit: prodUnit,
        gst: parseFloat(prodGst || '0'),
        image: prodImage || null,
      };

      if (editingProductId) {
        await api.patch(`/products/${editingProductId}`, payload);
        showToast('Product update ho gaya! ✅', 'success');
      } else {
        await api.post('/products', payload);
        showToast('Naya Product add ho gaya! 🎉', 'success');
      }

      setShowAddProductModal(false);
      clearProductForm();
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error saving product', 'error');
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
    setProdPurchasePrice(String(p.purchasePrice));
    setProdSellingPrice(String(p.sellingPrice));
    setProdStock(String(p.stock));
    setProdUnit(p.unit || 'pcs');
    setProdGst(String(p.gst || '0'));
    setProdImage(p.image || null);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Kya aap sach me "${name}" ko delete karna chahte hain?`)) return;
    try {
      await api.delete(`/products/${id}`);
      showToast('Product delete ho gaya', 'success');
      fetchInventoryData();
    } catch {
      showToast('Product delete nahi hua', 'error');
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

  // Submit bulk purchase (restock)
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !purchaseQty) return;

    setSubmitting(true);
    try {
      const payload = {
        items: [
          {
            productId: selectedProductId,
            quantity: Number(purchaseQty),
            purchasePrice: newPurchasePrice ? Number(newPurchasePrice) : undefined,
          },
        ],
      };

      await api.post('/inventory/purchase', payload);
      showToast('Stock update ho gaya!', 'success');
      setShowPurchaseModal(false);
      clearRestockForm();
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error aa raha hai, try again', 'error');
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
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-xl border text-sm font-bold shadow-xl transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>📦 Inventory & Products</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
              Samaan ka stock, rate aur photo manage karein
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => { clearProductForm(); setShowAddProductModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: '#059669', color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '10px 18px', border: 'none', borderRadius: 10,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.25)'
              }}
            >
              <Plus className="w-4 h-4" /> Naya Item Add Karein
            </button>

            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: '#2563eb', color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '10px 18px', border: 'none', borderRadius: 10,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
              }}
            >
              <Boxes className="w-4 h-4" /> Import Excel
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
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

                        // Map standard fields, handle different column names from "Export Items.xlsx"
                        const mapped = json.map(row => ({
                          name: row['Item name*'] || row['Item Name'] || row.name || row.Name || '',
                          price: parseFloat(row['Sale price'] || row['Sales Price*'] || row['Selling Price'] || row.price || row.Price || 0),
                          stock: parseFloat(row['Current stock quantity'] || row['Opening Quantity'] || row.stock || row.Stock || 0),
                          barcode: row['Item code'] || row['Item Code'] || row.barcode || row.Barcode || '',
                        })).filter(item => item.name);

                        const res = await api.post('/products/import', { products: mapped });
                        if (res.data?.success) {
                          showToast(`✅ ${res.data.imported} products imported!`, 'success');
                          fetchInventoryData();
                        } else {
                          showToast('Import failed', 'error');
                        }
                      } catch (err: any) {
                        showToast('Error parsing file: ' + err.message, 'error');
                      } finally {
                        setLoading(false);
                      }
                    };
                    reader.readAsArrayBuffer(file);
                  } catch (err) {
                    showToast('Failed to load excel parser', 'error');
                    setLoading(false);
                  }
                  e.target.value = ''; // Reset input
                }}
              />
            </label>

            <button
              onClick={() => { clearRestockForm(); setShowPurchaseModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '10px 18px', border: 'none', borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <Boxes className="w-4 h-4" /> Stock Restock
            </button>

            <button
              onClick={() => { clearRestockForm(); setShowAuditModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#0f172a',
                fontSize: 13, fontWeight: 700, padding: '10px 18px', border: '1px solid #cbd5e1', borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <History className="w-4 h-4" /> Stock Check / Fix
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Stock Value</p>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>₹{stats.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Kharid rate ke hisaab se</p>
              </div>
              <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 12, color: '#059669' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Low Stock Alert</p>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#e11d48', margin: '6px 0 0' }}>{lowStock.length} Items</h3>
                <p style={{ fontSize: 11, color: '#e11d48', margin: '4px 0 0', fontWeight: 600 }}>5 unit se kam bache hain</p>
              </div>
              <div style={{ background: '#fff1f2', padding: 12, borderRadius: 12, color: '#e11d48' }}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Products</p>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>{products.length} Items</h3>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{stats.totalStockItems.toFixed(0)} total units</p>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, color: '#0f172a' }}>
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Catalog & History Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Products Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
              {/* Search & Filter Bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <Search className="w-4 h-4" style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Samaan ya Barcode search karein..."
                    style={{
                      width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10,
                      padding: '10px 14px 10px 38px', fontSize: 13, outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  style={{
                    background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10,
                    padding: '10px 14px', fontSize: 13, outline: 'none', fontWeight: 600
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                      <th style={{ padding: '10px 8px' }}>Product</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Selling MRP</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Stock</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading...</td></tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Koi item nahi mila</td></tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const stockNum = Number(p.stock);
                        const isLow = stockNum <= 5;
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 44, height: 44, borderRadius: 8, background: '#f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0'
                              }}>
                                {p.image ? (
                                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{p.name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                                  {p.brand ? `${p.brand} • ` : ''}{p.barcode ? `Barcode: ${p.barcode}` : 'No Barcode'}
                                </p>
                              </div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                              ₹{Number(p.purchasePrice).toFixed(0)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              ₹{Number(p.sellingPrice).toFixed(0)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <span style={{ fontWeight: 800, color: isLow ? '#e11d48' : '#0f172a' }}>
                                {stockNum.toFixed(0)} {p.unit}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() => handleEditProduct(p)}
                                  style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-700" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  style={{ padding: 6, borderRadius: 6, border: '1px solid #fecdd3', background: '#fff1f2', cursor: 'pointer' }}
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

            {/* History Logs */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <History className="w-4 h-4" /> Stock History (Khata)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 520 }}>
                {logs.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 13 }}>Koi history nahi hai</p>
                ) : (
                  logs.slice(0, 20).map((log) => {
                    const qtyVal = Number(log.quantity);
                    const isPositive = qtyVal > 0;
                    return (
                      <div key={log.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                            {log.product?.name || 'Item'}
                          </h4>
                          <span style={{
                            fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                            background: isPositive ? '#ecfdf5' : '#fff1f2',
                            color: isPositive ? '#059669' : '#e11d48'
                          }}>
                            {isPositive ? '+' : ''}{qtyVal.toFixed(0)} {log.product?.unit || ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                          <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>Pehle: {Number(log.beforeStock)} → Ab: {Number(log.afterStock)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal with Image Picker */}
      {showAddProductModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              {editingProductId ? '✏️ Item Edit Karein' : '➕ Naya Item Add Karein'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Item details aur photo enter karein.</p>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Product Photo Picker */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Item Photo (Upload or Paste Link)
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 64, height: 64, borderRadius: 10, border: '2px dashed #cbd5e1',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: '#f8fafc', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                    }}
                  >
                    {prodImage ? (
                      <img src={prodImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Photo</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={prodImage || ''}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="Ya photo ka URL link paste karein..."
                      style={{
                        width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8,
                        padding: '10px 12px', fontSize: 12, outline: 'none'
                      }}
                    />
                    {prodImage && (
                      <button
                        type="button"
                        onClick={() => setProdImage(null)}
                        style={{ fontSize: 11, color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0' }}
                      >
                        Photo hatayein
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Product Name *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Jaise: Fortune Oil 1L, Parle-G 100g"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Barcode & Brand */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Barcode (Optional)</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    placeholder="Scan / Type barcode"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Brand (Optional)</label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    placeholder="Jaise: Nestle, Amul"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Category</label>
                <select
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                >
                  <option value="">-- Category Chunein --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Cost & Selling Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Kharid Rate (₹ Cost)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodPurchasePrice}
                    onChange={(e) => setProdPurchasePrice(e.target.value)}
                    placeholder="₹ 0.00"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Bechne Ka Rate (₹ MRP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    placeholder="₹ 0.00"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Stock & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Initial Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="Kitna piece hai?"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Unit</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  >
                    <option value="pcs">Pcs (Piece)</option>
                    <option value="kg">Kg (Kilogram)</option>
                    <option value="packet">Packet</option>
                    <option value="l">Ltr (Litre)</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowAddProductModal(false); clearProductForm(); }}
                  style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Saving...' : editingProductId ? 'Update Karein' : 'Save Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>📦 Samaan Restock Karein</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Naya maal dukaan mein aaya toh yahan add karein.</p>

            <form onSubmit={handlePurchaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Samaan Chunein</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                >
                  <option value="">-- Item Select Karein --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Kitna Aaya (Qty) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="Jaise: 20"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Kharid Rate (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    placeholder="Naya rate?"
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowPurchaseModal(false); clearRestockForm(); }}
                  style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Stock Add Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Audit Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>🔍 Stock Check / Fix</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Asal dukaan me kitna stock bacha hai, count karke set karein.</p>

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Samaan Chunein</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                >
                  <option value="">-- Item Select Karein --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Computer: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Asal Count (Real Stock) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  placeholder="Asal mein kitne piece bache hain?"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Reason (Wajah)</label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="Jaise: Damage ho gaya, expiry, etc."
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowAuditModal(false); clearRestockForm(); }}
                  style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Stock Sahi Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
