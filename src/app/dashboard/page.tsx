'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { playSuccessSound } from '@/lib/sounds';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  DollarSign,
  FileText,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Boxes,
  Zap,
  ShoppingBag,
  Bell,
  Coins,
  QrCode,
  LayoutDashboard,
  Package,
  BarChart2,
  Settings,
  Globe,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';

interface BestSeller {
  name: string;
  brand: string;
  unit: string;
  price: string;
  quantitySold: number;
}

interface CategorySales {
  name: string;
  value: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: string;
  unit: string;
}

interface DashboardStats {
  todaySales: number;
  billsCount: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  bestSellers: BestSeller[];
  categorySales: CategorySales[];
  lowStock: {
    count: number;
    items: LowStockItem[];
  };
}

export default function DashboardPage() {
  const { user, store, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [orderAlert, setOrderAlert] = useState<{
    billNumber: string;
    totalAmount: string;
    paymentMode: string;
    cashier: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/pos');
      }
    }
  }, [user, authLoading, router]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard');
      setStats(response.data.data);
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (!store?.id || !user || user.role !== 'ADMIN') return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const socket = io(SOCKET_URL, {
      query: { storeId: store.id },
    });

    socket.on('new-order', (order: any) => {
      playSuccessSound();
      setOrderAlert({
        billNumber: order.billNumber,
        totalAmount: Number(order.totalAmount).toFixed(2),
        paymentMode: order.paymentMode,
        cashier: order.user?.name || 'Cashier',
      });
      setTimeout(() => setOrderAlert(null), 5000);
      setStats((prev) => {
        if (!prev) return null;
        const total = Number(order.totalAmount);
        return {
          ...prev,
          todaySales: prev.todaySales + total,
          billsCount: prev.billsCount + 1,
          cashSales: prev.cashSales + (order.paymentMode === 'CASH' ? total : 0),
          upiSales: prev.upiSales + (order.paymentMode === 'UPI' ? total : 0),
          cardSales: prev.cardSales + (order.paymentMode !== 'CASH' && order.paymentMode !== 'UPI' ? total : 0),
        };
      });
      fetchStats();
    });

    return () => { socket.disconnect(); };
  }, [store]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const maxCategorySales = stats?.categorySales.reduce((max, cat) => Math.max(max, cat.value), 1) || 1;

  const statCards = stats ? [
    {
      label: "Today's Revenue",
      value: `₹${stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
      sub: '+12.4% vs yesterday',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      label: 'Bills Generated',
      value: `${stats.billsCount}`,
      sub: 'Live checkout tracking',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: 'UPI Collections',
      value: `₹${stats.upiSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
      sub: `${stats.todaySales > 0 ? ((stats.upiSales / stats.todaySales) * 100).toFixed(0) : 0}% of total`,
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      label: 'Cash Collections',
      value: `₹${stats.cashSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
      sub: `${stats.todaySales > 0 ? ((stats.cashSales / stats.todaySales) * 100).toFixed(0) : 0}% of total`,
      icon: <Coins className="w-5 h-5" />,
    },
  ] : [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

      {/* Real-time Order Notification */}
      {orderAlert && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          background: '#fff', padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid #e5e7eb', borderRadius: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
          maxWidth: 340, animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ background: '#000', padding: 8, color: '#fff' }}>
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 13, color: '#111827', margin: 0 }}>NEW ORDER — {orderAlert.paymentMode}</p>
            <p style={{ fontSize: 12, color: '#666', margin: '2px 0' }}>Bill #{orderAlert.billNumber} by {orderAlert.cashier}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#111827', margin: 0 }}>₹{orderAlert.totalAmount}</p>
          </div>
        </div>
      )}

      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-0">

        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4 md:p-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-gray-600 font-medium m-0">Welcome back 👋</p>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 m-0 leading-tight">{store?.name || 'Dashboard'}</h1>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/pos')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#111827', color: '#ffffff', borderRadius: 10, fontWeight: 700, fontSize: 13,
                padding: '10px 18px', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
              }}
            >
              <Zap className="w-4 h-4" /> Open POS
            </button>
            <button
              onClick={() => router.push('/inventory')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#ffffff', color: '#111827', borderRadius: 10, fontWeight: 700, fontSize: 13,
                padding: '10px 18px', border: '1px solid #cbd5e1', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
              }}
            >
              <Boxes className="w-4 h-4" /> Inventory
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-6 lg:px-8 flex flex-col gap-6">

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {statCards.map((card, i) => (
                  <div key={i} style={{
                    background: '#fff', padding: '24px',
                    border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    position: 'relative', display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{
                      width: 44, height: 44, border: '1px solid #e5e7eb', borderRadius: 16,
                      background: '#f9fafb', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#111827',
                    }}>
                      {card.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{card.label}</p>
                      <p style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: 0 }}>{card.value}</p>
                    </div>
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #eaeaea', paddingTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="flex flex-col lg:flex-row gap-4 md:gap-6">

                {/* Category Sales */}
                <div className="flex-1 lg:w-2/3 bg-white p-5 md:p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp className="w-4 h-4" style={{ color: '#111827' }} />
                      Category Sales
                    </h3>
                    <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Today (INR)</span>
                  </div>

                  {stats.categorySales.length === 0 ? (
                    <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 13 }}>
                      No sales recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {stats.categorySales.map((cat, i) => {
                        const colors = ['#000', '#333', '#666', '#999', '#ccc'];
                        const pct = (cat.value / maxCategorySales) * 100;
                        return (
                          <div key={cat.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{cat.name}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>₹{cat.value.toFixed(0)}</span>
                            </div>
                            <div style={{ height: 8, background: '#fff', border: '1px solid #000' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: colors[i % colors.length],
                                transition: 'width 0.8s ease',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Best Sellers */}
                <div className="w-full lg:w-1/3 bg-white p-5 md:p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShoppingBag className="w-4 h-4" style={{ color: '#111827' }} />
                    Top Sellers
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.bestSellers.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#666', textAlign: 'center', padding: '24px 0' }}>No data yet.</p>
                    ) : stats.bestSellers.map((item, i) => {
                      const rankColors = ['#000', '#000', '#000', '#000', '#000'];
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                        }}>
                          <div style={{
                            width: 28, height: 28, background: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                            <p style={{ fontSize: 10, color: '#666', margin: 0 }}>MRP ₹{Number(item.price).toFixed(0)}</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: rankColors[i], flexShrink: 0 }}>
                            {item.quantitySold} {item.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex flex-col lg:flex-row gap-4 md:gap-6">

                {/* Low Stock Alerts */}
                <div className="flex-1 lg:w-2/3 bg-white p-5 md:p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: '#111827' }} />
                      Low Stock Alerts
                      <span style={{ background: '#111827', color: '#ffffff',  fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                        {stats.lowStock.count} items
                      </span>
                    </h3>
                    <button
                      onClick={() => router.push('/inventory')}
                      style={{ fontSize: 12, color: '#111827', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      Open Manager <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stats.lowStock.items.length === 0 ? (
                      <div style={{ gridColumn: '1/-1', padding: '20px 0', textAlign: 'center', color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                        ✨ All stock levels are healthy!
                      </div>
                    ) : stats.lowStock.items.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', borderRadius: '10px',
                      }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>{item.name}</p>
                          <p style={{ fontSize: 10, color: '#666', margin: 0 }}>Below threshold</p>
                        </div>
                        <span style={{ fontWeight: 800, color: '#fff', background: '#000', padding: '4px 10px', fontSize: 11 }}>
                          {Number(item.stock).toFixed(1)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QR Code */}
                <div className="w-full lg:w-1/3 bg-gray-900 p-5 md:p-6 text-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center gap-4">
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <QrCode className="w-4 h-4" /> Online Store QR
                  </h3>
                  <div style={{ background: '#fff', padding: 10, border: '2px solid #fff' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`http://localhost:3001/store/${store?.id}`)}`}
                      alt="Store QR"
                      width={130} height={130}
                      style={{ display: 'block', borderRadius: 0 }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, margin: '0 0 4px', fontWeight: 600, opacity: 0.9 }}>Scan to browse & order</p>
                    <p style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>Customers can order from their phone</p>
                  </div>
                  <a
                    href={`/store/${store?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'rgba(255,255,255,0.2)', color: '#fff',
                      fontWeight: 700, fontSize: 12, padding: '10px 20px',
                      borderRadius: 12, textDecoration: 'none', width: '100%',
                      textAlign: 'center', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    View Catalog <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', padding: '60px 0' }}>Failed to load dashboard metrics.</div>
          )}
        </div>
      </div>
    </div>
  );
}
