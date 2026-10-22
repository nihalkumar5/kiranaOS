'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  BookOpen,
  Shield,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Save,
  Volume2,
  Receipt,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Sparkles
} from 'lucide-react';

export default function SettingsPage() {
  const { user, store, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'store' | 'hardware' | 'credit' | 'security'>('store');

  // Store profile form
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeGstin, setStoreGstin] = useState('');
  const [storeUpiId, setStoreUpiId] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  // Hardware & billing preferences
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [autoPrintBill, setAutoPrintBill] = useState(false);
  const [showUdhaarAlert, setShowUdhaarAlert] = useState(true);

  // Udhaar policy settings
  const [defaultCreditLimit, setDefaultCreditLimit] = useState('5000');
  const [reminderTone, setReminderTone] = useState<'gentle' | 'firm' | 'detailed'>('gentle');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing store and hardware settings
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get('/stores');
        if (res.data?.data) {
          const s = res.data.data;
          setStoreName(s.name || '');
          setStorePhone(s.phone || '');
          setStoreAddress(s.address || '');
          setStoreGstin(s.gstin || '');
          setStoreUpiId(s.upiId || '');
        }
      } catch (err) {
        console.error('Failed to load store settings', err);
      }
    };

    fetchStore();

    // Load hardware prefs from localStorage
    try {
      const savedHw = localStorage.getItem('kos_hardware_settings');
      if (savedHw) {
        const parsed = JSON.parse(savedHw);
        if (parsed.printerPaperSize) setPrinterPaperSize(parsed.printerPaperSize);
        if (parsed.audioFeedback !== undefined) setAudioFeedback(parsed.audioFeedback);
        if (parsed.autoPrintBill !== undefined) setAutoPrintBill(parsed.autoPrintBill);
        if (parsed.showUdhaarAlert !== undefined) setShowUdhaarAlert(parsed.showUdhaarAlert);
        if (parsed.receiptFooter) setReceiptFooter(parsed.receiptFooter);
        if (parsed.defaultCreditLimit) setDefaultCreditLimit(parsed.defaultCreditLimit);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStore(true);
    setStatus(null);

    try {
      const res = await api.patch('/stores', {
        name: storeName,
        phone: storePhone,
        address: storeAddress,
        gstin: storeGstin,
        upiId: storeUpiId,
      });

      if (res.data.success) {
        // Also save receipt footer & hardware prefs in localStorage
        const hwConfig = {
          printerPaperSize,
          audioFeedback,
          autoPrintBill,
          showUdhaarAlert,
          receiptFooter,
          defaultCreditLimit,
        };
        localStorage.setItem('kos_hardware_settings', JSON.stringify(hwConfig));

        // Update active store in localStorage
        const currentStore = JSON.parse(localStorage.getItem('kos_store') || '{}');
        const updatedStore = { ...currentStore, ...res.data.data };
        localStorage.setItem('kos_store', JSON.stringify(updatedStore));

        setStatus({ type: 'success', message: 'Dukaan ki details aur UPI VPA save ho gaya!' });
      } else {
        setStatus({ type: 'error', message: res.data.message || 'Save failed' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to save store' });
    } finally {
      setSavingStore(false);
    }
  };

  const handleSaveHardware = (e: React.FormEvent) => {
    e.preventDefault();
    const hwConfig = {
      printerPaperSize,
      audioFeedback,
      autoPrintBill,
      showUdhaarAlert,
      receiptFooter,
      defaultCreditLimit,
    };
    localStorage.setItem('kos_hardware_settings', JSON.stringify(hwConfig));
    setStatus({ type: 'success', message: 'Hardware & Thermal Printer settings update ho gayi!' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'New password must be at least 6 characters long' });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setStatus({ type: 'success', message: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatus({ type: 'error', message: res.data.message || 'Failed to update password' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Something went wrong' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100/70 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-8">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <SettingsIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 m-0 leading-tight">
                  Store & Hardware Settings
                </h1>
                <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                  Dukaan profile, thermal receipt printer, UPI QR, Udhaar limits & security.
                </p>
              </div>
            </div>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('store'); setStatus(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'store'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dukaan Profile & UPI</span>
            </button>

            <button
              onClick={() => { setActiveTab('hardware'); setStatus(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'hardware'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Printer & Billing</span>
            </button>

            <button
              onClick={() => { setActiveTab('credit'); setStatus(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'credit'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Udhaar Khata Rules</span>
            </button>

            <button
              onClick={() => { setActiveTab('security'); setStatus(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-violet-600" />
              <span>Security & Password</span>
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {status && (
          <div className="px-6 pt-5 max-w-4xl">
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs animate-in fade-in ${
                status.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <p className="font-bold text-sm m-0">{status.message}</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="px-6 py-6 max-w-4xl">
          {/* TAB 1: STORE & UPI */}
          {activeTab === 'store' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-600" />
                    Dukaan Profile & UPI QR Code
                  </h2>
                  <p className="text-xs text-slate-500 font-medium m-0 mt-1">
                    Ye details aapke bills, thermal receipts aur dynamic UPI QR code me print hongi.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveStoreProfile} className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Dukaan Ka Naam (Store Name) *
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        required
                        placeholder="e.g. Sharma Kirana & General Store"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      WhatsApp / Helpline Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Store UPI ID / VPA (For Dynamic QR Code) *
                    </label>
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={storeUpiId}
                        onChange={(e) => setStoreUpiId(e.target.value)}
                        placeholder="e.g. sharmakirana@okhdfcbank or 9876543210@paytm"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> POS counter pe is UPI ID ka exact bill amount wala QR code banega.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      GSTIN Number (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={storeGstin}
                        onChange={(e) => setStoreGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Dukaan Ka Pata (Address)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <textarea
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      rows={2}
                      placeholder="Shop No. 4, Main Market, Sector 15, Near City Chowk..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Thermal Receipt Footer Note
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="e.g. Dhanyawad! Phir Padhaariye. Items exchanged within 3 days with bill."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingStore}
                    className="bg-slate-950 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2"
                  >
                    {savingStore ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-emerald-400" />
                        <span>Save Store Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HARDWARE & PRINTER */}
          {activeTab === 'hardware' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  Thermal Printer & POS Billing Preferences
                </h2>
                <p className="text-xs text-slate-500 font-medium m-0 mt-1">
                  Connect POS with USB/Bluetooth receipt printers and scanner hardware.
                </p>
              </div>

              <form onSubmit={handleSaveHardware} className="p-6 md:p-8 space-y-6">
                {/* Paper Size */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                    Receipt Printer Paper Width
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPrinterPaperSize('58mm')}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        printerPaperSize === '58mm'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Receipt className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-slate-900 m-0">58mm (2-inch Thermal)</p>
                        <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                          Standard portable Bluetooth/USB thermal roll for compact billing.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrinterPaperSize('80mm')}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        printerPaperSize === '80mm'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Receipt className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-slate-900 m-0">80mm (3-inch Thermal)</p>
                        <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                          Wide enterprise receipt printer (Epson, TVS, NGX) with GST breakdown.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 m-0">Audio Beeper Sound on Scan</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0">
                        Plays a pleasant confirmation chime whenever a barcode is scanned.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={audioFeedback}
                      onChange={(e) => setAudioFeedback(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 m-0">Auto-Print Thermal Receipt</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0">
                        Automatically opens print dialog immediately after bill payment completes.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPrintBill}
                      onChange={(e) => setAutoPrintBill(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 m-0">Show Customer Udhaar Warning in POS</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0">
                        Alert cashier if customer mobile has pending credit balance before generating bill.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showUdhaarAlert}
                      onChange={(e) => setShowUdhaarAlert(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-slate-950 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Save Hardware Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: UDHAAR KHATA POLICY */}
          {activeTab === 'credit' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  Udhaar Khata & Payment Reminders
                </h2>
                <p className="text-xs text-slate-500 font-medium m-0 mt-1">
                  Configure default credit limits, WhatsApp message tones and recovery settings.
                </p>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Default Credit Limit (Naye Grahak Ke Liye)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3.5 top-3 text-slate-500 font-black text-sm">₹</span>
                    <input
                      type="number"
                      value={defaultCreditLimit}
                      onChange={(e) => setDefaultCreditLimit(e.target.value)}
                      placeholder="5000"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-8 pr-4 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                    Grahak ka balance is limit se upar hone par POS alert dikhayega.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Preferred WhatsApp Reminder Tone
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setReminderTone('gentle')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        reminderTone === 'gentle'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900 m-0">Vinamra (Gentle)</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0 mt-1">
                        &quot;Namaste ji, aapka hisaab itna banta hai...&quot;
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderTone('firm')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        reminderTone === 'firm'
                          ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900 m-0">Santulit (Firm)</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0 mt-1">
                        &quot;Kripya aaj shaam tak purana hisaab clear kar dein...&quot;
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderTone('detailed')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        reminderTone === 'detailed'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900 m-0">Hisaab Copy (Detailed)</p>
                      <p className="text-[11px] text-slate-500 font-medium m-0 mt-1">
                        Pura itemized bill + direct UPI payment link.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const hwConfig = {
                        printerPaperSize,
                        audioFeedback,
                        autoPrintBill,
                        showUdhaarAlert,
                        receiptFooter,
                        defaultCreditLimit,
                        reminderTone,
                      };
                      localStorage.setItem('kos_hardware_settings', JSON.stringify(hwConfig));
                      setStatus({ type: 'success', message: 'Udhaar khata settings save ho gayi!' });
                    }}
                    className="bg-slate-950 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Save Khata Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-600" />
                  Account Security & Password
                </h2>
                <p className="text-xs text-slate-500 font-medium m-0 mt-1">
                  Apne KiranaOS admin account ka password update karein.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="p-6 md:p-8 space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Re-type new password"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="bg-slate-950 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center justify-center min-w-[160px]"
                  >
                    {isSubmittingPassword ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
