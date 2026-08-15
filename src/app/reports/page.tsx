'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';
import {
  Calendar, Download, DollarSign, FileText, AlertTriangle, Scale, Plus, History,
  TrendingUp, TrendingDown, Activity, Award, Clock, CheckCircle, LayoutDashboard,
  Zap, Package, BarChart2, Coins, Search, Check, X, Globe, ShoppingBag, ArrowUpRight
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cash Tally Modal States
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingTally, setSubmittingTally] = useState(false);

  // Access check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/pos');
      }
    }
  }, [user, authLoading, router]);

  const showToast = (message: string, type: 'success' | 'error') => {
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
      setTallies(tallRes.data.data);
    } catch (err) {
      console.error('Failed to load analytics data', err);
      showToast('Data load nahi ho paya, try again', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = async () => {
    try {
      let sd = new Date();
      if(timeframe === 'today') sd.setDate(sd.getDate());
      else if(timeframe === 'last7days') sd.setDate(sd.getDate() - 7);
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
    } catch (err) {
      showToast('CSV Export fail ho gaya', 'error');
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
      showToast('Galle ka hisaab save ho gaya!', 'success');
      setShowTallyModal(false);
      setActualAmount('');
      setNotes('');
      fetchAnalyticsData();
    } catch (err) {
      const error = err as any;
      showToast(error.response?.data?.message || 'Galti hui, try again', 'error');
    } finally {
      setSubmittingTally(false);
    }
  };

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <div style={{ width: 40, height: 40, border: '1px solid #e5e7eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview & Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'insights', label: 'Product Insights', icon: <Award className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory Health', icon: <Package className="w-4 h-4" /> },
    { id: 'cash', label: 'Cash Tally', icon: <Scale className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-white text-gray-900 border border-gray-100' : 'bg-gray-900 text-white border border-gray-800'}`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />

      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-[#059669]" />
              Analytics & Insights
            </h1>
            <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-wider">Business Intelligence Dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#059669] focus:border-[#059669] block px-4 py-2.5 font-bold cursor-pointer transition-colors hover:bg-gray-100"
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-6 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 text-sm font-bold border-b-2 transition-colors relative ${
                  activeTab === tab.id 
                    ? 'border-[#059669] text-[#059669]' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#059669] rounded-full animate-spin"></div>
            </div>
          ) : !analytics ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Error Loading Data</h2>
              <button onClick={fetchAnalyticsData} className="mt-4 text-[#059669] font-bold hover:underline">Try Again</button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
              
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Revenue Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="bg-blue-100 p-3 rounded-2xl">
                          <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${analytics.trendPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {analytics.trendPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(analytics.trendPercent).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider relative z-10">Revenue</p>
                      <h3 className="text-4xl font-black text-gray-900 mt-1 relative z-10">₹{analytics.currentRevenue.toFixed(2)}</h3>
                      <p className="text-xs font-semibold text-gray-400 mt-2 relative z-10">vs ₹{analytics.prevRevenue.toFixed(2)} prev period</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="bg-purple-100 p-3 rounded-2xl">
                          <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider relative z-10">Bills Generated</p>
                      <h3 className="text-4xl font-black text-gray-900 mt-1 relative z-10">{analytics.billsCount}</h3>
                      <p className="text-xs font-semibold text-gray-400 mt-2 relative z-10">In selected timeframe</p>
                    </div>
                  </div>

                  {/* Category Breakdown (Overview Mode) */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-[#059669]" />
                      Revenue by Category
                    </h3>
                    <div className="space-y-4">
                      {analytics.categoryBreakdown.length > 0 ? analytics.categoryBreakdown.map((cat, i) => {
                        const percent = analytics.currentRevenue > 0 ? (cat.amount / analytics.currentRevenue) * 100 : 0;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                              <span>{cat.name}</span>
                              <span>₹{cat.amount.toFixed(2)} ({percent.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-[#059669] h-2.5 rounded-full"
                              ></motion.div>
                            </div>
                          </div>
                        )
                      }) : (
                        <p className="text-sm text-gray-500 font-semibold text-center py-4">No category data available.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PRODUCT INSIGHTS */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Top Selling Products
                    </h3>
                    <p className="text-sm text-gray-500 font-semibold mb-6">Products driving the most volume in the selected timeframe.</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-black">
                            <th className="pb-3 px-4 pl-0">Rank</th>
                            <th className="pb-3 px-4">Product</th>
                            <th className="pb-3 px-4 text-right">Qty Sold</th>
                            <th className="pb-3 px-4 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topSellers.length > 0 ? analytics.topSellers.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-4 pl-0">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                  #{idx + 1}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-gray-900">{item.product.name}</div>
                                <div className="text-xs text-gray-500 font-semibold">Stock left: {item.product.stock} {item.product.unit}</div>
                              </td>
                              <td className="py-4 px-4 text-right font-black text-gray-700">
                                {item.quantity} <span className="text-xs text-gray-400 font-bold">{item.product.unit}</span>
                              </td>
                              <td className="py-4 px-4 text-right font-black text-[#059669]">
                                ₹{item.revenue.toFixed(2)}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500 font-semibold">No sales data found.</td></tr>
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
                  {/* Restock Needed (Kya Mangana Hai) */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm border-t-4 border-t-red-500">
                    <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-red-500" />
                      Must Restock (Kya Mangana Hai)
                    </h3>
                    <p className="text-sm text-gray-500 font-semibold mb-6">Fast-moving items that are running out of stock (Stock &lt; 10).</p>
                    
                    <div className="space-y-4">
                      {analytics.restockNeeded.length > 0 ? analytics.restockNeeded.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
                          <div>
                            <p className="font-bold text-gray-900">{item.product.name}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">Sold {item.qtySold} {item.product.unit} recently</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 font-black text-xs rounded-full animate-pulse">
                              Only {item.stock} left
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="font-bold text-gray-900">All Good!</p>
                          <p className="text-xs font-semibold text-gray-500">No fast-moving items are low on stock.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slow Movers (Kya Kam Karna Hai) */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm border-t-4 border-t-gray-400">
                    <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      Slow Movers (Kya Kam Karna Hai)
                    </h3>
                    <p className="text-sm text-gray-500 font-semibold mb-6">Items with high stock (&gt;20) but zero or very low sales recently.</p>
                    
                    <div className="space-y-4">
                      {analytics.slowMovers.length > 0 ? analytics.slowMovers.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                          <div>
                            <p className="font-bold text-gray-900">{item.product.name}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">Sold only {item.qtySold} {item.product.unit}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 font-black text-xs rounded-full">
                              {item.stock} {item.product.unit} in stock
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="font-bold text-gray-900">Efficient Inventory!</p>
                          <p className="text-xs font-semibold text-gray-500">No dead stock found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CASH TALLY */}
              {activeTab === 'cash' && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-[#059669]" />
                        Galle ka Hisaab (Cash Logs)
                      </h3>
                      <p className="text-sm text-gray-500 font-semibold mt-1">Track physical cash vs system records</p>
                    </div>
                    <button
                      onClick={() => setShowTallyModal(true)}
                      className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Galla Milayein (Tally Now)
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-50 rounded-xl">
                        <tr>
                          <th className="px-4 py-3 font-black rounded-l-xl">Date / Time</th>
                          <th className="px-4 py-3 font-black">Kisne Check Kiya</th>
                          <th className="px-4 py-3 font-black text-right">System Me Cash</th>
                          <th className="px-4 py-3 font-black text-right">Galle Me Cash</th>
                          <th className="px-4 py-3 font-black text-right">Farq (Shortage/Surplus)</th>
                          <th className="px-4 py-3 font-black rounded-r-xl">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tallies.length > 0 ? tallies.map((t) => {
                          const diff = Number(t.difference);
                          const isShort = diff < 0;
                          const isSurplus = diff > 0;
                          return (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-4 font-semibold text-gray-700">
                                {new Date(t.createdAt).toLocaleDateString()} <span className="text-gray-400 text-xs">{new Date(t.createdAt).toLocaleTimeString()}</span>
                              </td>
                              <td className="px-4 py-4 font-bold text-gray-900">{t.user?.name || 'Unknown'}</td>
                              <td className="px-4 py-4 text-right font-bold text-gray-600">₹{t.expectedAmount}</td>
                              <td className="px-4 py-4 text-right font-black text-gray-900">₹{t.actualAmount}</td>
                              <td className="px-4 py-4 text-right">
                                {diff === 0 ? (
                                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-black">
                                    <Check className="w-3 h-3" /> MATCHED
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-black ${isShort ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isShort ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                    ₹{Math.abs(diff).toFixed(2)} {isShort ? 'SHORT' : 'EXTRA'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-500 text-xs font-semibold max-w-[200px] truncate" title={t.notes || ''}>
                                {t.notes || '-'}
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={6} className="text-center py-12">
                              <Scale className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                              <p className="text-gray-500 font-bold">Koi cash log nahi hai.</p>
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

      {/* Tally Modal */}
      <AnimatePresence>
        {showTallyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900">Cash Tally Entry</h3>
                <button onClick={() => setShowTallyModal(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-sm border border-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleTallySubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Galle mein physically kitna cash hai?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-[#059669] focus:border-[#059669] block pl-10 pr-4 py-3 font-bold transition-colors"
                      placeholder="e.g. 5240.50"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-[#059669] focus:border-[#059669] block p-4 font-medium transition-colors"
                    placeholder="Koi farq kyu aaya, uska reason..."
                    rows={3}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingTally}
                    className="w-full text-white bg-[#059669] hover:bg-green-700 font-black rounded-xl text-sm px-5 py-3.5 text-center shadow-md shadow-green-900/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingTally ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>Save Tally <CheckCircle className="w-4 h-4" /></>
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
