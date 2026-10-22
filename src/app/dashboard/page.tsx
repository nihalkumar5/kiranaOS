'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { playSuccessSound } from '@/lib/sounds';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  TrendingUp,
  CreditCard,
  Coins,
  Receipt,
  BookOpen,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Store,
  ChevronRight,
  Clock,
  Package,
  Layers,
  BarChart3,
  ExternalLink
} from 'lucide-react';
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
  totalCreditDue?: number;
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
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/pos');
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
        totalAmount: Number(order.totalAmount).toFixed(0),
        paymentMode: order.paymentMode,
        cashier: order.user?.name || 'Cashier',
      });
      setTimeout(() => setOrderAlert(null), 5000);
      fetchStats();
    });

    return () => { socket.disconnect(); };
  }, [store]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const todaySales = stats?.todaySales || 0;
  const cashSales = stats?.cashSales || 0;
  const upiSales = stats?.upiSales || 0;
  const cardSales = stats?.cardSales || 0;
  const totalCreditDue = stats?.totalCreditDue || 0;

  const cashPct = todaySales > 0 ? Math.round((cashSales / todaySales) * 100) : 0;
  const upiPct = todaySales > 0 ? Math.round((upiSales / todaySales) * 100) : 0;
  const avgBillValue = (stats?.billsCount && stats.billsCount > 0) ? Math.round(todaySales / stats.billsCount) : 0;

  const maxCategorySales = stats?.categorySales.reduce((max, cat) => Math.max(max, cat.value), 1) || 1;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      {/* Live Order Push Toast */}
      <AnimatePresence>
        {orderAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  New Order • {orderAlert.paymentMode}
                </span>
                <span className="text-xs font-mono font-black text-white">
                  ₹{orderAlert.totalAmount}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate m-0 mt-0.5">
                Bill #{orderAlert.billNumber} • {orderAlert.cashier}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />

      {/* Main Surface */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-12">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 m-0 tracking-tight">
                  {store?.name || 'KiranaOS Supermart'}
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Counter
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                Real-time sales, payment split, udhaar overview & inventory health.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push('/credit')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-xs transition-colors shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Udhaar Khata</span>
            </button>

            <button
              onClick={() => router.push('/pos')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs shadow-sm transition-all group"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Open POS [F2]</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[350px] gap-3">
              <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400">Loading live business telemetry...</p>
            </div>
          ) : stats ? (
            <>
              {/* ─── 1. TOP KPI ROW (POLAR / STRIPE BENTO CARDS) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Today Revenue */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-sm transition-shadow relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Today&apos;s Revenue
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums m-0">
                      ₹{todaySales.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                        {stats.billsCount} Bills Today
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Avg: ₹{avgBillValue}/bill
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Cash In Counter */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Cash In Counter
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums m-0">
                      ₹{cashSales.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-slate-800 h-full rounded-full transition-all duration-500"
                          style={{ width: `${cashPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600 shrink-0">
                        {cashPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. UPI & Digital Payments */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      UPI & Digital
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums m-0">
                      ₹{upiSales.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${upiPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 shrink-0">
                        {upiPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Market Udhaar / Dues */}
                <div
                  onClick={() => router.push('/credit')}
                  className="bg-gradient-to-br from-amber-50/70 to-white rounded-2xl border border-amber-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                      Market Udhaar (Pending)
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-amber-950 tracking-tight tabular-nums m-0">
                      ₹{totalCreditDue.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs font-bold text-amber-800">
                      <span>Khata Dekhein</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── 2. MIDDLE BENTO ROW ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Columns: Collections Breakdown & Category Sales */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 m-0 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        Today&apos;s Payment Collections Split
                      </h2>
                      <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                        Cash vs UPI vs Cards distribution for counter reconciliation.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      ₹{todaySales.toLocaleString('en-IN')} Total
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-1">
                    <div
                      title={`Cash: ₹${cashSales}`}
                      className="bg-slate-900 h-full rounded-full transition-all duration-700"
                      style={{ width: `${todaySales > 0 ? (cashSales / todaySales) * 100 : 50}%` }}
                    />
                    <div
                      title={`UPI: ₹${upiSales}`}
                      className="bg-blue-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${todaySales > 0 ? (upiSales / todaySales) * 100 : 50}%` }}
                    />
                    {cardSales > 0 && (
                      <div
                        title={`Cards: ₹${cardSales}`}
                        className="bg-violet-600 h-full rounded-full transition-all duration-700"
                        style={{ width: `${(cardSales / todaySales) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Legend Cards */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Cash</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono m-0">
                        ₹{cashSales.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[11px] font-semibold text-slate-500">{cashPct}% share</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100/80">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-[11px] font-bold text-blue-900 uppercase">UPI / QR</span>
                      </div>
                      <p className="text-lg font-black text-blue-950 font-mono m-0">
                        ₹{upiSales.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[11px] font-semibold text-blue-600">{upiPct}% share</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Cards/Other</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono m-0">
                        ₹{cardSales.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {todaySales > 0 ? ((cardSales / todaySales) * 100).toFixed(0) : 0}% share
                      </span>
                    </div>
                  </div>

                  {/* Category Breakdown Horizontal Bars */}
                  {stats.categorySales && stats.categorySales.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">
                        Top Categories by Sales
                      </h3>
                      <div className="space-y-2.5">
                        {stats.categorySales.slice(0, 4).map((cat) => {
                          const pct = Math.round((cat.value / maxCategorySales) * 100);
                          return (
                            <div key={cat.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>{cat.name}</span>
                                <span className="font-mono text-slate-900">₹{cat.value.toFixed(0)}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 5 Columns: Low Stock Alert Card */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black text-slate-900 m-0">
                            Low Stock Warnings
                          </h2>
                          <p className="text-[11px] text-slate-500 font-medium m-0">
                            Items with 5 or fewer units left.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        {stats.lowStock.count} Alert{stats.lowStock.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {stats.lowStock.items.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Boxes className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700 m-0">Stock Levels Healthy</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Koi bhi item khatam nahi hone wala.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                        {stats.lowStock.items.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="text-xs font-bold text-slate-900 truncate m-0">
                                {item.name}
                              </p>
                              <span className="text-[10px] text-rose-600 font-semibold font-mono">
                                Only {item.stock} {item.unit} remaining
                              </span>
                            </div>
                            <button
                              onClick={() => router.push('/inventory')}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                            >
                              Restock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Manage all SKUs</span>
                    <button
                      onClick={() => router.push('/inventory')}
                      className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Go to Inventory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── 3. BOTTOM BENTO ROW: TOP PRODUCTS & QUICK LAUNCHPAD ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 Cols: Best Selling Items */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 m-0 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        Today&apos;s Best Selling Products
                      </h2>
                      <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                        High velocity items ordered across all counter bills today.
                      </p>
                    </div>
                  </div>

                  {stats.bestSellers.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600 m-0">No Sales Recorded Today Yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Open the POS terminal to start billing customer orders.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {stats.bestSellers.map((item, index) => (
                        <div
                          key={item.name}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate m-0">
                                {item.name}
                              </p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ₹{item.price} per {item.unit}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                              {item.quantitySold} {item.unit} sold
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right 4 Cols: Quick Actions Launchpad */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 m-0 flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Quick Launchpad
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      Instant shortcuts for rapid counter workflows.
                    </p>

                    <div className="space-y-2.5">
                      <button
                        onClick={() => router.push('/pos')}
                        className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-left flex items-center justify-between transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                          <div>
                            <p className="text-xs font-black m-0 leading-tight">New POS Bill</p>
                            <span className="text-[10px] text-slate-400">Barcode scanner & quick cash</span>
                          </div>
                        </div>
                        <kbd className="px-2 py-0.5 bg-slate-800 text-[10px] font-mono font-bold text-slate-300 rounded-md">
                          F2
                        </kbd>
                      </button>

                      <button
                        onClick={() => router.push('/credit')}
                        className="w-full p-3 bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 rounded-2xl text-left flex items-center justify-between border border-amber-200/60 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-amber-700" />
                          <div>
                            <p className="text-xs font-black m-0 leading-tight">Udhaar Khata</p>
                            <span className="text-[10px] text-amber-800/80">WhatsApp reminders & passbook</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-700 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => router.push('/reports')}
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl text-left flex items-center justify-between border border-slate-200/80 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-4 h-4 text-slate-700" />
                          <div>
                            <p className="text-xs font-black m-0 leading-tight">Daily Cash Tally</p>
                            <span className="text-[10px] text-slate-500">Day close & register audit</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">KiranaOS v2.4 Enterprise</span>
                    <span className="text-[11px] font-mono text-emerald-600 font-bold">● System OK</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
