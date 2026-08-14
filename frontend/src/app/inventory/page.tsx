'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import {
  ArrowLeft,
  Plus,
  History,
  Search,
  AlertTriangle,
  Boxes,
  DollarSign,
  LayoutDashboard,
  Zap,
  Package,
  BarChart2,
  Globe
} from 'lucide-react';

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  purchasePrice: string;
  sellingPrice: string;
  stock: string;
  unit: string;
  brand: string | null;
  gst: string;
}

interface InventoryLog {
  id: string;
  type: 'PURCHASE' | 'SALE' | 'AUDIT_ADJUSTMENT' | 'RETURN';
  quantity: string;
  beforeStock: string;
  afterStock: string;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, store, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Forms state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [actualStock, setActualStock] = useState('');
  const [auditReason, setAuditReason] = useState('');

  // UI helpers
  const [searchQuery, setSearchQuery] = useState('');
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
      const [prodRes, logRes, lowRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory/history'),
        api.get('/inventory/low-stock'),
      ]);

      setProducts(prodRes.data.data);
      setLogs(logRes.data.data);
      setLowStock(lowRes.data.data);
    } catch (e) {
      console.error('Failed to load inventory data', e);
      showToast('Data load nahi ho paya, check internet', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 1. Submit bulk purchase (restock)
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
      showToast('Samaan add ho gaya!', 'success');
      setShowPurchaseModal(false);
      clearForm();
      fetchInventoryData();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Error aa raha hai, try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit Audit override
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

      showToast('Stock update ho gaya!', 'success');
      setShowAuditModal(false);
      clearForm();
      fetchInventoryData();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Error aa raha hai', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setSelectedProductId('');
    setPurchaseQty('');
    setNewPurchasePrice('');
    setActualStock('');
    setAuditReason('');
  };

  // Filtered Products
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery)) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats derived calculations
  const stats = useMemo(() => {
    let totalStockItems = 0;
    let totalStockValue = 0; // Purchase price * stock
    let totalSalesValue = 0; // Selling price * stock

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fafafa', backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)', backgroundSize: '40px 40px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-4 border-2 border-black text-sm font-bold transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
            toast.type === 'success'
              ? 'bg-white text-black'
              : 'bg-black text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', padding: '28px 16px',
        gap: 8, flexShrink: 0, height: '100vh', position: 'sticky', top: 0
      }}>
        <div style={{ marginBottom: 32, paddingLeft: 8 }}>
          <Logo size="md" />
        </div>

        {[
          { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', active: false, onClick: () => router.push('/dashboard') },
          { icon: <Zap className="w-4 h-4" />, label: 'POS Terminal', active: false, onClick: () => router.push('/pos') },
          { icon: <Package className="w-4 h-4" />, label: 'Inventory', active: true, onClick: () => {} },
          { icon: <BarChart2 className="w-4 h-4" />, label: 'Reports', active: false, onClick: () => router.push('/reports') },
          { icon: <Globe className="w-4 h-4" />, label: 'Storefront', active: false, onClick: () => router.push('/storefront-builder') },
        ].map(item => (
          <button key={item.label} onClick={item.onClick} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: item.active ? '#f3f4f6' : 'transparent', 
            color: item.active ? '#111827' : '#6b7280',
            fontWeight: item.active ? 800 : 600, fontSize: 13,
            border: 'none', 
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'all 0.15s',
            boxShadow: item.active ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
            marginBottom: item.active ? '4px' : '0'
          }}>
            {item.icon} {item.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        
        {/* Top Bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 13, color: '#666', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory Manager</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1.2 }}>Dukaan Ka Samaan</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowPurchaseModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#111827', color: '#ffffff', fontWeight: 800, fontSize: 13,
                padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 16, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
              }}>
              <Plus className="w-4 h-4" /> Naya Samaan (Add)
            </button>
            <button
              onClick={() => setShowAuditModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#ffffff', color: '#111827',  fontWeight: 800, fontSize: 13,
                padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 16, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
              }}>
              <History className="w-4 h-4" /> Stock Check / Fix
            </button>
          </div>
        </div>

        <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Aggregate Widgets Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Total Stock ki Kimat</p>
                <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>₹{stats.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0', fontWeight: 600 }}>Kharid rate ke hisaab se</p>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#111827' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Khatam Hone Wala Samaan</p>
                <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>{lowStock.length} Items</h3>
                <p style={{ fontSize: 12, color: '#eab308', margin: '6px 0 0', fontWeight: 700 }}>15 piece se kam hai!</p>
              </div>
              <div style={{ background: '#000', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#fff' }}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Dukaan mein Total Piece</p>
                <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>{stats.totalStockItems.toFixed(0)} Units</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0', fontWeight: 600 }}>{products.length} Alag-alag items mein</p>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#111827' }}>
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Left Side: Product Stock catalog */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Boxes className="w-5 h-5" />
                  Samaan ki List
                </h2>
                <div style={{ position: 'relative', width: 250 }}>
                  <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: 12, color: '#666' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Samaan dhundhein..."
                    style={{
                      width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
                      padding: '10px 12px 10px 36px', fontSize: 13, fontWeight: 600,
                      outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Item / Brand</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>Kharid (Cost)</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>Bechne ka Rate (MRP)</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>Current Stock</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', fontWeight: 600, color: '#666' }}>Loading ho raha hai...</td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', fontWeight: 600, color: '#666' }}>Koi item nahi mila</td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const stockNum = Number(p.stock);
                        const isLow = stockNum < 15;
                        const isOut = stockNum <= 0;
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                            <td style={{ padding: '16px 0' }}>
                              <p style={{ margin: 0, fontWeight: 800, color: '#111827' }}>{p.name}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666', fontWeight: 600 }}>
                                {p.brand || 'No Brand'} • Barcode: {p.barcode || 'N/A'}
                              </p>
                            </td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 700, color: '#666' }}>₹{Number(p.purchasePrice).toFixed(0)}</td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 800, color: '#111827' }}>₹{Number(p.sellingPrice).toFixed(0)}</td>
                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                              <span style={{ fontWeight: 900, color: '#111827', fontSize: 15 }}>{stockNum.toFixed(0)}</span>{' '}
                              <span style={{ color: '#666', fontSize: 11, fontWeight: 700 }}>{p.unit}</span>
                            </td>
                            <td style={{ padding: '16px 0', textAlign: 'center' }}>
                              {isOut ? (
                                <span style={{ background: '#111827', color: '#ffffff',  padding: '4px 10px', fontSize: 10, fontWeight: 800, border: '1px solid #000' }}>OUT OF STOCK</span>
                              ) : isLow ? (
                                <span style={{ background: '#ffffff', color: '#111827', padding: '4px 10px', fontSize: 10, fontWeight: 800, border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>LOW STOCK</span>
                              ) : (
                                <span style={{ background: '#f9fafb', color: '#111827', padding: '4px 10px', fontSize: 10, fontWeight: 800, border: '1px solid #ccc' }}>IN STOCK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side: Stock Transaction Logs */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, paddingBottom: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <History className="w-5 h-5" />
                Stock ka Khata (History)
              </h2>

              <div style={{ flex: 1, overflowY: 'auto', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', fontWeight: 600, color: '#666' }}>Loading...</p>
                ) : logs.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', fontWeight: 600, color: '#666' }}>Koi history nahi hai.</p>
                ) : (
                  logs.map((log) => {
                    const qtyVal = Number(log.quantity);
                    const isPositive = qtyVal > 0;
                    return (
                      <div key={log.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <h4 style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#111827' }}>
                            {log.product?.name || 'Unknown Product'}
                          </h4>
                          <span style={{
                            fontSize: 11, fontWeight: 900, padding: '2px 8px', border: '1px solid #e5e7eb', borderRadius: 16,
                            background: log.type === 'PURCHASE' ? '#fff' : log.type === 'SALE' ? '#000' : '#f0f0f0',
                            color: log.type === 'SALE' ? '#fff' : '#000'
                          }}>
                            {isPositive ? '+' : ''}{qtyVal.toFixed(0)}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666', fontWeight: 600, marginBottom: 8 }}>
                          {new Date(log.createdAt).toLocaleString()} • {log.user?.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eaeaea', paddingTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                            Pehle: {Number(log.beforeStock)} → Abhi: {Number(log.afterStock)}
                          </span>
                          <span style={{ fontSize: 10, fontStyle: 'italic', color: '#666', fontWeight: 600 }}>
                            {log.type === 'PURCHASE' ? 'Kharida (Restock)' : log.type === 'SALE' ? 'Bika (POS)' : 'Stock Check Kiya'}
                          </span>
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

      {/* Record Purchase Modal */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, width: '100%', maxWidth: 450, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>Naya Samaan Add Karein</h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 24px', fontWeight: 600 }}>Kitna maal dukaan mein aaya, yahan enter karein.</p>

            <form onSubmit={handlePurchaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Samaan Chunein (Select Item)</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                >
                  <option value="">-- Click karke item select karein --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Pehle se: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Kitna Aaya (Qty)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="Jaise ki: 50"
                    style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Kharid Rate (₹) Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    placeholder="Naya rate?"
                    style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowPurchaseModal(false); clearForm(); }}
                  style={{ flex: 1, background: '#ffffff', color: '#111827',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: '#111827', color: '#ffffff',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', opacity: submitting ? 0.5 : 1 }}
                >
                  {submitting ? 'Save ho raha hai...' : 'Save Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Audit correction Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, width: '100%', maxWidth: 450, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>Stock Check / Fix Karein</h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 24px', fontWeight: 600 }}>Agar dukaan me stock aur computer me stock match nahi ho raha, toh yahan sahi (fix) karein.</p>

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Samaan Chunein</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                >
                  <option value="">-- Click karke item select karein --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Computer me: {Number(p.stock)} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Asal mein kitna hai? (Real Count)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  placeholder="Count karke likhein"
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Kyu change kar rahe hain? (Reason)</label>
                <input
                  type="text"
                  required
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="Jaise ki: Chori ho gaya, damage ho gaya, etc"
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowAuditModal(false); clearForm(); }}
                  style={{ flex: 1, background: '#ffffff', color: '#111827',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: '#111827', color: '#ffffff',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', opacity: submitting ? 0.5 : 1 }}
                >
                  {submitting ? 'Save ho raha hai...' : 'Sahi Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
