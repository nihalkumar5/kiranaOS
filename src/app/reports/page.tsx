'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Calendar, Download, DollarSign, FileText, AlertTriangle, Scale, Plus, History,
  TrendingUp, TrendingDown, Activity, Award, Clock, CheckCircle, LayoutDashboard,
  Zap, Package, BarChart2, Coins, Search, Check, X, Globe, ShoppingBag, ArrowUpRight,
  RefreshCw, CheckCircle2, ChevronRight, Layers, PieChart, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyticsData {
  timeframe: string;
  currentRevenue: number;
  prevRevenue: number;
  trendPercent: number;
  billsCount: number;
  topSellers: any[];
  categoryBreakdown: any[];
  slowMovers: any[];
  restockNeeded: any[];
}

interface CashTally {
  id: string;
  tallyDate: string;
  expectedAmount: string;
  actualAmount: string;
  difference: string;
  notes: string;
  createdAt: string;
  user: {
    name: string;
  };
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'inventory' | 'cash'>('overview');
  const [timeframe, setTimeframe] = useState<'today' | 'last7days' | 'thisMonth'>('last7days');
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tallies, setTallies] = useState<CashTally[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cash Tally Modal States
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingTally, setSubmittingTally] = useState(false);

  // Access check
  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/pos');
    }
  }, [user, authLoading, router]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAnalyticsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeframe]);

  async function fetchAnalyticsData() {
    setLoading(true);
    try {
      const [analyticsRes, tallRes] = await Promise.all([
        api.get(`/reports/analytics?timeframe=${timeframe}`),
        api.get('/reports/cash-tally')
      ]);

      setAnalytics(analyticsRes.data.data);
      setTallies(tallRes.data.data || []);
    } catch (err) {
      console.error('Failed to load analytics data', err);
      showToast('Data load nahi ho paya, please retry', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let sd = new Date();
      if (timeframe === 'today') sd.setDate(sd.getDate());
      else if (timeframe === 'last7days') sd.setDate(sd.getDate() - 7);
      else sd.setDate(1);

      const startDate = sd.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const res = await api.get(`/reports/export?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kirana_sales_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('CSV Report download ho gaya! 📄', 'success');
    } catch (err) {
      showToast('CSV Export fail ho gaya', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleTallySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualAmount) return;

    setSubmittingTally(true);
    try {
      await api.post('/reports/cash-tally', {
        actualAmount: Number(actualAmount),
        notes: notes || undefined
      });
      showToast('Galle ka hisaab verify & save ho gaya! 💵', 'success');
      setShowTallyModal(false);
      setActualAmount('');
      setNotes('');
      fetchAnalyticsData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Galle ka hisaab save nahi ho paya', 'error');
    } finally {
      setSubmittingTally(false);
    }
  };

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Checking permissions...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview & Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'insights', label: 'Product Insights', icon: <Award className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory Health', icon: <Package className="w-4 h-4" /> },
    { id: 'cash', label: 'Cash Tally (Galla)', icon: <Scale className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' 
                : 'bg-rose-950 text-rose-200 border-rose-500/30 shadow-rose-500/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span className="text-xs">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                Reports & Business Intelligence
              </h1>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60 uppercase">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Sales Performance, Cash Reconciliation, Velocity Trends & Dead Stock Audit
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Timeframe Pill Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {[
                { id: 'today', label: 'Today' },
                { id: 'last7days', label: '7 Days' },
                { id: 'thisMonth', label: 'This Month' }
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    timeframe === tf.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200/80 px-6 overflow-x-auto hide-scrollbar flex-shrink-0">
          <div className="flex gap-6 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-1 text-xs font-black border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Calculating analytics...</span>
            </div>
          ) : !analytics ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
              <h2 className="text-base font-black text-slate-900">Analytics Data Unavailable</h2>
              <p className="text-xs text-slate-500 mt-1 mb-4">Could not calculate metrics for the selected timeframe.</p>
              <button 
                onClick={fetchAnalyticsData} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
              
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top KPI Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Revenue Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          Net Revenue
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono flex items-center gap-0.5 ${
                          analytics.trendPercent >= 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                          {analytics.trendPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(analytics.trendPercent).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                        ₹{analytics.currentRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-2 flex items-center gap-1 font-mono">
                        vs ₹{analytics.prevRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} previous period
                      </p>
                    </div>

                    {/* Bills Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Invoices & Bills
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          Completed
                        </span>
                      </div>
                      <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                        {analytics.billsCount}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-2 font-mono">
                        Avg. Ticket: ₹{analytics.billsCount > 0 ? (analytics.currentRevenue / analytics.billsCount).toFixed(0) : '0'} / bill
                      </p>
                    </div>

                    {/* Fast Mover Products Count */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Active SKUs Sold
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200/60">
                          Catalog
                        </span>
                      </div>
                      <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                        {analytics.topSellers.length}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-2">
                        Distinct items ordered in selected cycle
                      </p>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-emerald-600" />
                          Category Revenue Distribution
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Which product departments drive the most money</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {analytics.categoryBreakdown.length} Categories
                      </span>
                    </div>

                    <div className="space-y-4">
                      {analytics.categoryBreakdown.length > 0 ? (
                        analytics.categoryBreakdown.map((cat, i) => {
                          const percent = analytics.currentRevenue > 0 ? (cat.amount / analytics.currentRevenue) * 100 : 0;
                          return (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-800">{cat.name || 'General / Uncategorized'}</span>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-slate-900 font-black">₹{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  <span className="text-slate-400 text-[11px]">({percent.toFixed(1)}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className="bg-emerald-600 h-2 rounded-full"
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 font-medium text-center py-8">
                          No category sales data for this period.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PRODUCT INSIGHTS */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          Top Selling Products Leaderboard
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Products contributing maximum sales volume and cash inflow
                        </p>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-black bg-slate-50/50">
                            <th className="py-3 px-5">Rank</th>
                            <th className="py-3 px-5">Product SKU</th>
                            <th className="py-3 px-5 text-right">Units Sold</th>
                            <th className="py-3 px-5 text-right">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analytics.topSellers.length > 0 ? (
                            analytics.topSellers.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-5">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-mono font-black text-[11px] ${
                                    idx === 0 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300/60' 
                                      : idx === 1 
                                      ? 'bg-slate-200 text-slate-800 border border-slate-300' 
                                      : idx === 2 
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300/60' 
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <div className="font-bold text-slate-900">{item.product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Stock left: {item.product.stock} {item.product.unit}
                                  </div>
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono font-black text-slate-800">
                                  {item.quantity} <span className="text-[10px] text-slate-400 font-medium">{item.product.unit}</span>
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono font-black text-emerald-600">
                                  ₹{item.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center py-10 text-slate-400 font-medium">
                                No sales data found for this timeframe.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: INVENTORY HEALTH */}
              {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Must Restock (Fast moving & Low stock) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-rose-500">
                    <div className="mb-4">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-rose-500" />
                        Must Restock (Kya Mangana Hai)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        High-velocity items with critical remaining stock (&lt; 10 units)
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {analytics.restockNeeded.length > 0 ? (
                        analytics.restockNeeded.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-rose-50/40 rounded-xl border border-rose-100">
                            <div>
                              <p className="font-bold text-xs text-slate-900">{item.product.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Sold {item.qtySold} {item.product.unit} recently
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-700 font-mono font-black text-[10px] rounded-lg border border-rose-200">
                                Only {item.stock} left
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-xs text-slate-800">Healthy Stock Levels</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">No fast-moving items are in danger of stock-out.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slow Movers (Dead Capital) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-slate-400">
                    <div className="mb-4">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Slow Movers (Kya Kam Karna Hai)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        High stock items (&gt;20) with stagnant sales tying up your money
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {analytics.slowMovers.length > 0 ? (
                        analytics.slowMovers.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div>
                              <p className="font-bold text-xs text-slate-900">{item.product.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Sold only {item.qtySold} {item.product.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2.5 py-1 bg-slate-200 text-slate-700 font-mono font-bold text-[10px] rounded-lg">
                                {item.stock} in shelf
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-xs text-slate-800">Optimized Turnover</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">No stagnant dead inventory identified.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CASH TALLY */}
              {activeTab === 'cash' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        Galla Cash Reconciliation (Cash Tally Logs)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Audit physical drawer cash vs KiranaOS calculated billing balance
                      </p>
                    </div>
                    <button
                      onClick={() => setShowTallyModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 active:bg-black text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Galla Milayein (Count Cash)
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-y border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-black">Date & Time</th>
                          <th className="px-4 py-3 font-black">Operator</th>
                          <th className="px-4 py-3 font-black text-right">System Expected</th>
                          <th className="px-4 py-3 font-black text-right">Physical Cash</th>
                          <th className="px-4 py-3 font-black text-right">Farq (Variance)</th>
                          <th className="px-4 py-3 font-black">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tallies.length > 0 ? (
                          tallies.map((t) => {
                            const diff = Number(t.difference);
                            const isShort = diff < 0;
                            const isSurplus = diff > 0;
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3.5 text-slate-600 font-medium">
                                  {new Date(t.createdAt).toLocaleDateString()}{' '}
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-slate-900">{t.user?.name || 'Counter Staff'}</td>
                                <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-600">₹{t.expectedAmount}</td>
                                <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">₹{t.actualAmount}</td>
                                <td className="px-4 py-3.5 text-right">
                                  {diff === 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px] font-mono font-black">
                                      <Check className="w-3 h-3" /> MATCHED
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                                      isShort 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200/60' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
                                    }`}>
                                      {isShort ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                      ₹{Math.abs(diff).toFixed(2)} {isShort ? 'SHORT' : 'EXTRA'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-[11px] max-w-[200px] truncate" title={t.notes || ''}>
                                  {t.notes || '-'}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-12">
                              <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-400 font-medium">No cash tally logs recorded yet.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* Cash Tally Modal */}
      <AnimatePresence>
        {showTallyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Galle Ka Hisaab (Cash Tally)</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Reconcile counter drawer cash</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTallyModal(false)} 
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleTallySubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Galle Mein Physically Kitna Cash Hai?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-9 pr-4 py-2.5 text-base font-mono font-black"
                      placeholder="e.g. 5240"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Fast Denomination Addition Pills */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Cash Add:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[100, 200, 500, 1000, 2000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => {
                          const current = parseFloat(actualAmount) || 0;
                          setActualAmount((current + denom).toString());
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition-colors"
                      >
                        +₹{denom}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActualAmount('0')}
                      className="px-2 py-1 bg-rose-50 text-rose-600 font-mono font-bold text-xs rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Notes / Remarks (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 text-xs font-medium resize-none"
                    placeholder="Koi variance ka reason (e.g. doodh wale ko 200 diye the)..."
                    rows={2}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingTally}
                    className="w-full text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-black rounded-xl text-xs px-5 py-3 text-center shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingTally ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Verify & Save Cash Tally <CheckCircle2 className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
