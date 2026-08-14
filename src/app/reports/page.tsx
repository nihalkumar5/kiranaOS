'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';
import {
  Calendar,
  Download,
  DollarSign,
  FileText,
  AlertTriangle,
  Scale,
  Plus,
  History,
  TrendingUp,
  Activity,
  Award,
  Clock,
  CheckCircle,
  LayoutDashboard,
  Zap,
  Package,
  BarChart2,
  Coins,
  Search,
  Check,
  X,
  Globe
} from 'lucide-react';

interface PaymentSplit {
  mode: string;
  value: number;
}

interface TimelinePoint {
  date: string;
  sales: number;
  bills: number;
}

interface SalesAggregate {
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  billsCount: number;
  paymentSplit: PaymentSplit[];
  salesTimeline: TimelinePoint[];
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

  // Date range states (Default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // 14 days by default
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [aggregate, setAggregate] = useState<SalesAggregate | null>(null);
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
      fetchReportsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startDate, endDate]);

  async function fetchReportsData() {
    setLoading(true);
    try {
      const [aggRes, tallRes] = await Promise.all([
        api.get(`/reports/sales-aggregate?startDate=${startDate}&endDate=${endDate}`),
        api.get('/reports/cash-tally')
      ]);

      setAggregate(aggRes.data.data);
      setTallies(tallRes.data.data);
    } catch (err) {
      console.error('Failed to load reports data', err);
      showToast('Data load nahi ho paya, try again', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = async () => {
    try {
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
      fetchReportsData();
    } catch (err) {
      const error = err as any;
      showToast(error.response?.data?.message || 'Galti hui, try again', 'error');
    } finally {
      setSubmittingTally(false);
    }
  };

  // Simple Graph points generator
  const graphData = useMemo(() => {
    if (!aggregate || !aggregate.salesTimeline || aggregate.salesTimeline.length === 0) return null;
    const pts = aggregate.salesTimeline;
    
    let maxVal = 0;
    pts.forEach(p => { if (p.sales > maxVal) maxVal = p.sales; });
    
    // Scale maxVal to the nearest 100 or something nice
    maxVal = maxVal === 0 ? 10 : Math.ceil(maxVal * 1.2); 
    
    const width = 1000;
    const height = 250;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    
    const stepX = pts.length > 1 ? chartW / (pts.length - 1) : chartW;
    
    const points = pts.map((p, i) => {
      const x = paddingLeft + i * stepX;
      const y = paddingTop + chartH - (p.sales / maxVal) * chartH;
      return { x, y, val: p.sales, date: p.date };
    });
    
    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`
      : '';

    return {
      points,
      linePath,
      areaPath,
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      maxVal,
    };
  }, [aggregate]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <div style={{ width: 40, height: 40, border: '1px solid #e5e7eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 50, padding: '16px 24px',
            border: '1px solid #e5e7eb', borderRadius: 16, fontSize: 14, fontWeight: 800,
            background: toast.type === 'success' ? '#fff' : '#000',
            color: toast.type === 'success' ? '#000' : '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            transition: 'all 0.3s'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        
        {/* Top Bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 13, color: '#666', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics & Data</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1.2 }}>Dukaan Ka Khata (Reports)</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            
            {/* Dates */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '8px 12px', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Calendar className="w-4 h-4" style={{ color: '#111827' }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: '#111827', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 800, color: '#666', fontSize: 12 }}>se</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: '#111827', cursor: 'pointer' }}
              />
            </div>

            <button
              onClick={handleExportCSV}
              disabled={!aggregate || aggregate.billsCount === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#ffffff', color: '#111827',  fontWeight: 800, fontSize: 13,
                padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 16, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
                opacity: (!aggregate || aggregate.billsCount === 0) ? 0.5 : 1
              }}>
              <Download className="w-4 h-4" /> Download Excel/CSV
            </button>

            <button
              onClick={() => setShowTallyModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#111827', color: '#ffffff',  fontWeight: 800, fontSize: 13,
                padding: '12px 20px', border: '1px solid #e5e7eb', borderRadius: 16, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s',
              }}>
              <Plus className="w-4 h-4" /> Galla Milayein (Cash Tally)
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, border: '1px solid #e5e7eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : aggregate ? (
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Total Bika (Sales)</p>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>₹{aggregate.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                </div>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#111827' }}>
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Total Bill Bane</p>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>{aggregate.billsCount} Bills</h3>
                </div>
                <div style={{ background: '#000', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#fff' }}>
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>GST Jama Hua</p>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>₹{aggregate.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                </div>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#111827' }}>
                  <Scale className="w-6 h-6" />
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Chhut (Discount) Diya</p>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>₹{aggregate.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                </div>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, color: '#111827' }}>
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              
              {/* Sales Graph */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity className="w-5 h-5" />
                  Sales ka Graph
                </h2>
                
                {graphData ? (
                  <div style={{ position: 'relative', width: '100%', height: 250 }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${graphData.width} ${graphData.height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = graphData.paddingTop + graphData.height - graphData.paddingTop - graphData.paddingBottom - ratio * (graphData.height - graphData.paddingTop - graphData.paddingBottom);
                        return (
                          <g key={ratio}>
                            <line x1={graphData.paddingLeft} y1={y} x2={graphData.width - graphData.paddingRight} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth="2" />
                            <text x={graphData.paddingLeft - 10} y={y + 4} fill="#666" fontSize="11" fontWeight="700" textAnchor="end">
                              {Math.round(ratio * graphData.maxVal)}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Area */}
                      <path d={graphData.areaPath} fill="#f0f0f0" opacity={0.5} />
                      {/* Line */}
                      <path d={graphData.linePath} fill="none" stroke="#000" strokeWidth="4" />
                      
                      {/* Data Points */}
                      {graphData.points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#000" strokeWidth="3" />
                          {/* Label on every point if space allows, or alternating */}
                          <text x={p.x} y={graphData.height - 10} fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">
                            {p.date.split('-').slice(1).join('/')}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc' }}>
                    <p style={{ fontWeight: 600, color: '#666' }}>In dino ki koi sales nahi hai.</p>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Coins className="w-5 h-5" />
                  Paisa Kaise Aaya
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {aggregate.paymentSplit.map(split => {
                    const percent = aggregate.totalSales > 0 ? (split.value / aggregate.totalSales) * 100 : 0;
                    return (
                      <div key={split.mode}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{split.mode} Se</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>
                            ₹{split.value.toFixed(0)} <span style={{ color: '#666', fontWeight: 600, marginLeft: 4 }}>({percent.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: '#000' }} />
                        </div>
                      </div>
                    );
                  })}
                  {aggregate.paymentSplit.length === 0 && (
                    <p style={{ fontWeight: 600, color: '#666', textAlign: 'center' }}>Koi payment nahi hui</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cash Tally Table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <History className="w-5 h-5" />
                Galle ka Hisaab (Cash Logs)
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Date / Time</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Kisne Check Kiya</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>System me Cash</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>Galle me Cash</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'right' }}>Farq (Shortage/Surplus)</th>
                      <th style={{ padding: '12px 0', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: '#666', textAlign: 'center' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tallies.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 0', textAlign: 'center', fontWeight: 600, color: '#666' }}>Koi cash log nahi hai.</td>
                      </tr>
                    ) : (
                      tallies.map((t) => {
                        const diff = Number(t.difference);
                        const isOk = diff === 0;
                        const isShort = diff < 0;
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                            <td style={{ padding: '16px 0', fontWeight: 700, color: '#111827' }}>{new Date(t.createdAt).toLocaleString()}</td>
                            <td style={{ padding: '16px 0', fontWeight: 600, color: '#666' }}>{t.user?.name || 'Unknown'}</td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 800, color: '#111827' }}>₹{Number(t.expectedAmount).toFixed(0)}</td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 800, color: '#111827' }}>₹{Number(t.actualAmount).toFixed(0)}</td>
                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                              {isOk ? (
                                <span style={{ fontWeight: 800, color: '#666' }}>Matches!</span>
                              ) : (
                                <span style={{ 
                                  fontWeight: 900, 
                                  color: isShort ? '#000' : '#000', 
                                  background: isShort ? '#f0f0f0' : '#fff',
                                  border: '1px solid #e5e7eb', borderRadius: 16,
                                  padding: '4px 8px'
                                }}>
                                  {isShort ? '' : '+'}₹{diff.toFixed(0)}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: '#666', fontWeight: 600 }}>{t.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontWeight: 600, color: '#666' }}>Error: Data nahi mila.</p>
          </div>
        )}
      </div>

      {/* Cash Tally Modal */}
      {showTallyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, width: '100%', maxWidth: 450, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>Galla Milayein (Reconcile Cash)</h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 24px', fontWeight: 600 }}>Dukaan ke galle (drawer) me abhi kitna cash rakha hai?</p>

            <form onSubmit={handleTallySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Asal mein kitna Cash hai?</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="Jaise: 1500"
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: 8 }}>Koi Note ya Reason (Agar paisa kam/zyada hai)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jaise: Khulle diye thay, ya advance diya tha"
                  style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px', fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowTallyModal(false); setActualAmount(''); setNotes(''); }}
                  style={{ flex: 1, background: '#ffffff', color: '#111827',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTally}
                  style={{ flex: 1, background: '#111827', color: '#ffffff',  border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', opacity: submittingTally ? 0.5 : 1 }}
                >
                  {submittingTally ? 'Save ho raha hai...' : 'Save Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
