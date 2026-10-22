'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  Save,
  MonitorSmartphone,
  Palette,
  Image as ImageIcon,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Smartphone,
  Laptop,
  ShoppingBag,
  Store,
  Share2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import QRCode from 'qrcode';

const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'Indigo', hex: '#4f46e5', bg: 'bg-indigo-600' },
  { name: 'Violet', hex: '#7c3aed', bg: 'bg-violet-600' },
  { name: 'Amber', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'Rose', hex: '#e11d48', bg: 'bg-rose-600' },
  { name: 'Slate', hex: '#0f172a', bg: 'bg-slate-900' },
];

export default function StorefrontBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    storefrontEnabled: false,
    themeColor: '#059669',
    logoUrl: '',
    bannerUrl: '',
    tagline: '',
    description: '',
    phone: '',
    upiId: ''
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stores');
      if (res.data?.data) {
        const data = res.data.data;
        setStoreId(data.id);
        setFormData({
          name: data.name || '',
          storefrontEnabled: Boolean(data.storefrontEnabled),
          themeColor: data.themeColor || '#059669',
          logoUrl: data.logoUrl || '',
          bannerUrl: data.bannerUrl || '',
          tagline: data.tagline || '',
          description: data.description || '',
          phone: data.phone || '',
          upiId: data.upiId || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch store settings', err);
      showToast('Storefront settings load nahi ho paya', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/stores', formData);
      
      if (res.data?.data) {
        const currentStore = JSON.parse(localStorage.getItem('kos_store') || '{}');
        const updatedStore = { ...currentStore, ...res.data.data };
        localStorage.setItem('kos_store', JSON.stringify(updatedStore));
        window.dispatchEvent(new Event('kiranaos:store-updated'));
      }

      showToast('Storefront settings successfully update ho gayi! ✨', 'success');
    } catch (err: any) {
      console.error('Failed to save settings', err);
      showToast(err.response?.data?.message || 'Settings save karne me error aaya', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/store/${storeId}` 
    : `/store/${storeId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('Storefront link copy ho gaya!', 'success');
  };

  const handleOpenQrModal = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setQrModalOpen(true);
    } catch (err) {
      showToast('QR code generate nahi ho saka', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-900 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading Storefront...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[150] px-5 py-3 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10'
              : 'bg-rose-950 text-rose-200 border-rose-500/40 shadow-rose-500/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">
                  Storefront Builder & E-Commerce
                </h1>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                  formData.storefrontEnabled 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {formData.storefrontEnabled ? '● Live Online' : '○ Draft Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Customer Ordering Portal, Mobile Catalog, Brand Customizer & QR Marketing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenQrModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dukaan QR</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <a
              href={`/store/${storeId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Store</span>
            </a>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Publishing...' : 'Save & Publish'}</span>
            </button>
          </div>
        </header>

        {/* 2-Column Split Workspace: Controls on Left, Device Mockup on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Builder Controls */}
          <div className="w-full lg:w-[560px] xl:w-[620px] overflow-y-auto p-6 space-y-6 border-r border-slate-800/80 bg-slate-900/40">
            {/* Status Switch Card */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">Online Storefront Status</h3>
                  <span className={`w-2 h-2 rounded-full ${formData.storefrontEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  Jab on hoga, grahak aapke link se direct order place kar sakenge
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.storefrontEnabled}
                  onChange={(e) => setFormData({ ...formData, storefrontEnabled: e.target.checked })}
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border border-slate-700"></div>
              </label>
            </div>

            {/* Live Storefront URL Box */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-3">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Aapki Dukaan Ka Public Link
              </span>
              <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800">
                <span className="text-xs font-mono text-emerald-400 truncate flex-1">{publicUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="text-slate-400 hover:text-white p-1 transition-colors"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Brand Identity Card */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Brand Identity & Color Theme</h3>
              </div>

              {/* Store Name & Tagline */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Dukaan Ka Naam (Store Name)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    placeholder="e.g. Gupta General Store"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Taaza Rashan, Free Home Delivery 30 Mins"
                  />
                </div>

                {/* Theme Color Picker & Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, themeColor: preset.hex })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          formData.themeColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-white text-white bg-slate-800 shadow-sm'
                            : 'border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${preset.bg}`} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <input 
                      type="color" 
                      value={formData.themeColor}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-slate-950 border border-slate-800 p-0.5"
                    />
                    <input 
                      type="text" 
                      value={formData.themeColor}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    About Store / Description
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                    placeholder="Dukaan ka pata, delivery timings, minimum order value, ya koi khas suchna..."
                  />
                </div>
              </div>
            </div>

            {/* Media & Visuals */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Media, Logo & Hero Banner</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Store Logo URL
                  </label>
                  <input 
                    type="url" 
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Hero Banner Image URL
                  </label>
                  <input 
                    type="url" 
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-1542838132-92c53300491e"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  
                  {/* Preset Banner Quick Select */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Preset Banners:</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
                      })}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                    >
                      Fresh Kirana
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        bannerUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80'
                      })}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                    >
                      Fruits & Veggies
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80'
                      })}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                    >
                      Supermarket Aisles
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Interactive Phone / Desktop Preview */}
          <div className="flex-1 hidden md:flex flex-col bg-slate-950 p-6 items-center justify-center relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Device Toggle Pill */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-5 z-10 shadow-lg">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  previewDevice === 'mobile'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile App</span>
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  previewDevice === 'desktop'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                <span>Desktop Store</span>
              </button>
            </div>

            {/* Preview Frame */}
            {previewDevice === 'mobile' ? (
              /* Mobile Mockup (iPhone 16 Frame) */
              <div className="w-[340px] h-[640px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col z-10">
                {/* Dynamic Island / Speaker Notch */}
                <div className="w-24 h-5 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800 mr-2" />
                  <div className="w-2 h-2 rounded-full bg-blue-900/60" />
                </div>

                {/* Inner Screen */}
                <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col text-slate-900 relative">
                  {/* Store Header Banner */}
                  <div 
                    className="h-28 relative flex flex-col justify-end p-3 text-white overflow-hidden"
                    style={{ backgroundColor: formData.themeColor }}
                  >
                    {formData.bannerUrl ? (
                      <img 
                        src={formData.bannerUrl} 
                        alt="Store Banner" 
                        className="absolute inset-0 w-full h-full object-cover opacity-35" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    )}
                    
                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white shadow-md p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Store className="w-5 h-5 text-slate-800" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black truncate">{formData.name || 'Aapki Dukaan'}</div>
                        <div className="text-[9px] text-white/80 font-medium truncate">
                          {formData.tagline || 'Fresh Groceries Delivered Fast'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar & Categories */}
                  <div className="p-3 border-b border-slate-100 bg-slate-50/80">
                    <div className="bg-white rounded-xl px-3 py-1.5 text-[10px] text-slate-400 border border-slate-200 shadow-xs flex items-center gap-1.5">
                      <span>🔍</span> Search aata, daal, snacks...
                    </div>
                    <div className="flex gap-1.5 mt-2 overflow-x-auto hide-scrollbar">
                      {['All', 'Atta & Rice', 'Dairy', 'Snacks'].map((cat, i) => (
                        <span 
                          key={i} 
                          className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            i === 0 
                              ? 'text-white' 
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                          style={i === 0 ? { backgroundColor: formData.themeColor } : {}}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mock Product Grid */}
                  <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 bg-slate-50/50">
                    {[
                      { name: 'Aashirvaad Shudh Chakki Atta 5kg', price: '₹245', old: '₹260' },
                      { name: 'Fortune Sunlite Refined Oil 1L', price: '₹142', old: '₹155' },
                      { name: 'Tata Salt Vacuum Evaporated 1kg', price: '₹28', old: '₹30' },
                      { name: 'Amul Butter Pasteurised 500g', price: '₹275', old: '₹285' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="w-full h-16 bg-slate-100 rounded-xl mb-1.5 flex items-center justify-center text-xl">
                          🛒
                        </div>
                        <div className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight">
                          {item.name}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-900">{item.price}</span>
                          <button 
                            className="w-5 h-5 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: formData.themeColor }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Cart Bar */}
                  <div 
                    className="p-2.5 flex items-center justify-between text-white text-[10px] font-black shadow-lg"
                    style={{ backgroundColor: formData.themeColor }}
                  >
                    <span>2 Items in Cart</span>
                    <span className="flex items-center gap-1">
                      View Cart ₹387 →
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop Mockup Frame */
              <div className="w-[580px] h-[400px] bg-slate-900 rounded-3xl p-3 shadow-2xl border-2 border-slate-800 flex flex-col z-10">
                {/* Browser bar */}
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex-1 bg-slate-950 rounded-lg px-3 py-1 text-[10px] font-mono text-slate-400 text-center truncate">
                    https://kiranaos.in/store/{storeId}
                  </div>
                </div>

                {/* Inner Desktop Window */}
                <div className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col text-slate-900">
                  <div 
                    className="px-6 py-4 flex items-center justify-between text-white"
                    style={{ backgroundColor: formData.themeColor }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white shadow flex items-center justify-center text-slate-900 font-bold">
                        🏪
                      </div>
                      <div>
                        <div className="text-sm font-black">{formData.name || 'Aapki Dukaan'}</div>
                        <div className="text-[10px] text-white/80">{formData.tagline || 'Online Kirana Store'}</div>
                      </div>
                    </div>
                    <div className="text-xs bg-white/20 px-3 py-1 rounded-xl font-bold">
                      Cart (0)
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold mb-2">Live Responsive Customer Storefront</p>
                    <a
                      href={`/store/${storeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                      style={{ backgroundColor: formData.themeColor }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Full Desktop View
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal for Marketing */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">Aapki Dukaan Ka Digital QR</h3>
              <p className="text-xs text-slate-400 mt-1">
                Grahak is QR ko scan karke sidha aapki dukaan se online order kar sakte hain.
              </p>
            </div>

            {qrCodeDataUrl && (
              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                <img src={qrCodeDataUrl} alt="Storefront QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeDataUrl || '';
                  link.download = `kiranaos_store_qr_${storeId}.png`;
                  link.click();
                  showToast('QR Code download ho gaya!', 'success');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Download QR
              </button>
              <button
                onClick={() => setQrModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
