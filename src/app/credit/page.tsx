'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { playChimeSound, playErrorSound, speakHindi } from '@/lib/sounds';
import QRCode from 'qrcode';
import {
  BookOpen,
  Plus,
  Search,
  Phone,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  Share2,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Printer,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Edit3,
  Sliders,
  DollarSign,
  Send,
  HelpCircle
} from 'lucide-react';

interface CustomerSummary {
  id: string;
  name: string;
  mobile: string;
  creditLimit: number;
  totalGave: number;
  totalGot: number;
  balance: number;
  hasOverdue: boolean;
  lastTransaction: {
    id: string;
    type: 'GIVE_CREDIT' | 'PAYMENT_RECEIVED';
    amount: number;
    description: string | null;
    createdAt: string;
  } | null;
  transactionCount: number;
  whatsappUrl: string | null;
  reminderMsg: string | null;
}

interface TransactionItem {
  id: string;
  type: 'GIVE_CREDIT' | 'PAYMENT_RECEIVED';
  amount: number;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  order?: {
    billNumber: string;
    totalAmount: string | number;
  } | null;
}

export default function CreditKhataPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [summary, setSummary] = useState({
    totalMarketDue: 0,
    collectedToday: 0,
    customersWithDueCount: 0,
    totalCustomers: 0,
  });
  const [storeInfo, setStoreInfo] = useState<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dues' | 'all' | 'overdue' | 'settled'>('dues');

  // Selected Customer Ledger
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'GIVE_CREDIT' | 'PAYMENT_RECEIVED'>('GIVE_CREDIT');
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerMobileInput, setCustomerMobileInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Reminder Sheet Modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderTone, setSelectedReminderTone] = useState<'gentle' | 'firm' | 'detailed'>('gentle');
  const [customReminderText, setCustomReminderText] = useState('');
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Customer Edit Limit Modal
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editLimitInput, setEditLimitInput] = useState('');
  const [editNameInput, setEditNameInput] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch summary & customers
  const fetchKhataData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/credit?filter=${activeTab}&q=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setCustomers(res.data.data.customers || []);
        setSummary(res.data.data.summary || {
          totalMarketDue: 0,
          collectedToday: 0,
          customersWithDueCount: 0,
          totalCustomers: 0,
        });
        setStoreInfo(res.data.data.store || null);

        // Auto select first customer if none selected on desktop
        if (!selectedCustomerId && res.data.data.customers?.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedCustomerId(res.data.data.customers[0].id);
        }
      }
    } catch (err: any) {
      console.error('Fetch Khata Error:', err);
      showToast('Khata data load nahi ho paya', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKhataData();
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKhataData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch selected customer detail
  const fetchCustomerDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/credit/${id}`);
      if (res.data.success) {
        setCustomerDetails(res.data.data.customer);
        setTransactions(res.data.data.transactions || []);
      }
    } catch (err: any) {
      console.error('Customer details error:', err);
      showToast('Customer history load nahi ho paya', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
    } else {
      setCustomerDetails(null);
      setTransactions([]);
    }
  }, [selectedCustomerId]);

  // Listen for global AI updates
  useEffect(() => {
    const handleGlobalCreditUpdate = () => {
      fetchKhataData();
      if (selectedCustomerId) {
        fetchCustomerDetails(selectedCustomerId);
      }
    };

    window.addEventListener('kiranaos:credit-updated', handleGlobalCreditUpdate);
    return () => window.removeEventListener('kiranaos:credit-updated', handleGlobalCreditUpdate);
  }, [selectedCustomerId]);

  // Generate UPI QR Code
  const handleOpenQrModal = async (balance: number, name: string) => {
    if (balance <= 0) {
      showToast('Is grahak ka hisaab barabar hai! QR ki zaroorat nahi.', 'success');
      return;
    }

    const upiId = storeInfo?.upiId || 'ramprasadkirana@upi';
    const storeName = storeInfo?.name || 'Kirana Store';
    const cleanAmt = Math.round(balance);
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent('Khata payment by ' + name)}`;

    try {
      const dataUrl = await QRCode.toDataURL(upiUri, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error('QR code generation error:', err);
      showToast('QR code generate nahi ho paya', 'error');
    }
  };

  // Open Reminder Sheet Modal with customized tones
  const handleOpenReminderModal = (customer: any) => {
    const storeName = storeInfo?.name || 'Hamari Kirana Dukaan';
    const upiText = storeInfo?.upiId ? `\n📲 UPI ID: ${storeInfo.upiId}` : '';
    const balance = Math.round(customer.balance);

    let text = '';
    if (selectedReminderTone === 'gentle') {
      text = `🙏 नमस्ते ${customer.name} जी!\n\nआशा है आप सकुशल हैं। ${storeName} से आपका कुल बकाया हिसाब ₹${balance} है।\nकृपया सुविधानुसार भुगतान कर दें।${upiText}\n\nधन्यवाद! 🙏`;
    } else if (selectedReminderTone === 'firm') {
      text = `⚠️ नमस्ते ${customer.name} जी!\n\nकृपया ध्यान दें: ${storeName} पर आपका ₹${balance} का उधार हिसाब काफी समय से बकाया है।\nकृपया आज ही ऑनलाइन UPI या दुकान पर आकर हिसाब चुकता करें।${upiText}\n\nधन्यवाद! 🙏`;
    } else {
      text = `🧾 नमस्ते ${customer.name} जी!\n\n${storeName} खाता ब्योरा:\n• ग्राहक: ${customer.name}\n• कुल बकाया: ₹${balance}\n• भुगतान मोड: Cash / PhonePe / GPay${upiText}\n\nकृपया समय पर भुगतान करके सेवा का लाभ लें। धन्यवाद! 🙏`;
    }

    setCustomReminderText(text);
    setShowReminderModal(true);
  };

  // Update text when tone changes
  useEffect(() => {
    if (showReminderModal && customerDetails) {
      const storeName = storeInfo?.name || 'Hamari Kirana Dukaan';
      const upiText = storeInfo?.upiId ? `\n📲 UPI ID: ${storeInfo.upiId}` : '';
      const balance = Math.round(customerDetails.balance);

      let text = '';
      if (selectedReminderTone === 'gentle') {
        text = `🙏 नमस्ते ${customerDetails.name} जी!\n\nआशा है आप सकुशल हैं। ${storeName} से आपका कुल बकाया हिसाब ₹${balance} है।\nकृपया सुविधानुसार भुगतान कर दें।${upiText}\n\nधन्यवाद! 🙏`;
      } else if (selectedReminderTone === 'firm') {
        text = `⚠️ नमस्ते ${customerDetails.name} जी!\n\nकृपया ध्यान दें: ${storeName} पर आपका ₹${balance} का उधार हिसाब काफी समय से बकाया है।\nकृपया आज ही ऑनलाइन UPI या दुकान पर आकर हिसाब चुकता करें।${upiText}\n\nधन्यवाद! 🙏`;
      } else {
        text = `🧾 नमस्ते ${customerDetails.name} जी!\n\n${storeName} खाता ब्योरा:\n• ग्राहक: ${customerDetails.name}\n• कुल बकाया: ₹${balance}\n• भुगतान मोड: Cash / PhonePe / GPay${upiText}\n\nकृपया समय पर भुगतान करके सेवा का लाभ लें। धन्यवाद! 🙏`;
      }
      setCustomReminderText(text);
    }
  }, [selectedReminderTone]);

  // Send WhatsApp
  const handleLaunchWhatsApp = () => {
    if (!customerDetails) return;
    const cleanMobile = customerDetails.mobile.replace(/\D/g, '').slice(-10);
    const url = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(customReminderText)}`;
    window.open(url, '_blank');
    setShowReminderModal(false);
    showToast('WhatsApp reminder open ho gaya! 🚀', 'success');
  };

  // Copy reminder text
  const handleCopyReminder = () => {
    navigator.clipboard.writeText(customReminderText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
    showToast('Reminder text copy ho gaya!', 'success');
  };

  // Print Statement / Passbook
  const handlePrintStatement = () => {
    window.print();
  };

  // Open Add modal with presets
  const handleOpenAddModal = (
    type: 'GIVE_CREDIT' | 'PAYMENT_RECEIVED',
    presetCustomer?: CustomerSummary | null
  ) => {
    setModalType(type);
    if (presetCustomer) {
      setTargetCustomerId(presetCustomer.id);
      setCustomerNameInput(presetCustomer.name);
      setCustomerMobileInput(presetCustomer.mobile);
    } else if (customerDetails && selectedCustomerId) {
      setTargetCustomerId(customerDetails.id);
      setCustomerNameInput(customerDetails.name);
      setCustomerMobileInput(customerDetails.mobile);
    } else {
      setTargetCustomerId('');
      setCustomerNameInput('');
      setCustomerMobileInput('');
    }
    setAmountInput('');
    setNotesInput(type === 'GIVE_CREDIT' ? 'राशन / सामान' : 'नगद जमा');
    setDueDateInput('');
    setPaymentMethodInput('CASH');
    setShowAddModal(true);
  };

  // Submit transaction
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      showToast('Kripya sahi raashi dalein', 'error');
      playErrorSound();
      return;
    }

    if (!targetCustomerId && (!customerMobileInput || customerMobileInput.trim().length < 10)) {
      showToast('10-digit mobile number zaroori hai', 'error');
      playErrorSound();
      return;
    }

    setSubmitting(true);
    try {
      const descSuffix = modalType === 'PAYMENT_RECEIVED' ? ` (${paymentMethodInput})` : '';
      const payload = {
        customerId: targetCustomerId || undefined,
        customerName: customerNameInput.trim() || undefined,
        customerMobile: customerMobileInput.trim() || undefined,
        type: modalType,
        amount: amt,
        description: (notesInput.trim() || (modalType === 'GIVE_CREDIT' ? 'उधार सामान' : 'जमा राशि')) + descSuffix,
        dueDate: dueDateInput ? new Date(dueDateInput).toISOString() : undefined,
      };

      const res = await api.post('/credit', payload);
      if (res.data.success) {
        playChimeSound();
        const actionText = modalType === 'GIVE_CREDIT' ? 'उधार' : 'जमा';
        speakHindi(`${customerNameInput || 'Grahak'} ke khate me ${amt} rupaye ${actionText} darj ho gaya`);

        showToast(
          modalType === 'GIVE_CREDIT'
            ? `₹${amt} Udhaar darj ho gaya! ✍️`
            : `₹${amt} Jama darj ho gaya! 💰`,
          'success'
        );
        setShowAddModal(false);
        const updatedCustId = res.data.data.customer?.id;
        if (updatedCustId) {
          setSelectedCustomerId(updatedCustId);
        }
        fetchKhataData();
        if (updatedCustId) {
          fetchCustomerDetails(updatedCustId);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kiranaos:credit-updated'));
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Transaction save nahi ho paya', 'error');
      playErrorSound();
    } finally {
      setSubmitting(false);
    }
  };

  // Delete single transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!selectedCustomerId) return;
    if (!confirm('Kya aap is entry ko delete karna chahte hain? Isse balance dobara adjust ho jayega.')) return;

    try {
      const res = await api.delete(`/credit/${selectedCustomerId}?transactionId=${txId}`);
      if (res.data.success) {
        showToast('Entry delete ho gayi aur hisaab adjust ho gaya', 'success');
        fetchCustomerDetails(selectedCustomerId);
        fetchKhataData();
      }
    } catch (err: any) {
      showToast('Delete nahi ho paya', 'error');
    }
  };

  // Quick preset amount buttons helper
  const addQuickAmount = (val: number) => {
    const current = parseFloat(amountInput) || 0;
    setAmountInput(String(current + val));
  };

  // Quick preset due date helper
  const setQuickDueDate = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setDueDateInput(target.toISOString().split('T')[0]);
  };

  // Credit limit usage percentage
  const limitPercentage = useMemo(() => {
    if (!customerDetails || !customerDetails.creditLimit || customerDetails.creditLimit <= 0) return 0;
    const pct = Math.min(100, Math.max(0, (customerDetails.balance / customerDetails.creditLimit) * 100));
    return Math.round(pct);
  }, [customerDetails]);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[150] px-5 py-3 rounded-2xl border text-xs font-black shadow-2xl flex items-center gap-2.5 transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  Kirana Udhaar Khata (Credit Book)
                </h1>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/60 uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Customer Ledger, Auto WhatsApp Reminders & Instant UPI QR Payments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenAddModal('GIVE_CREDIT')}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer shadow-rose-600/20 hover:shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>- Udhaar Diya (Gave)</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('PAYMENT_RECEIVED')}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer shadow-emerald-600/20 hover:shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>+ Jama Mila (Got)</span>
            </button>
          </div>
        </header>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex-shrink-0">
          {/* Card 1: Total Market Due */}
          <div className="bg-white p-4 rounded-2xl border border-rose-200/70 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-rose-300 transition-all">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase flex items-center gap-1">
                Kul Udhaar Baaki (Market Outstanding)
              </span>
              <div className="text-2xl font-black text-rose-700 tracking-tight">
                ₹{summary.totalMarketDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                {summary.customersWithDueCount} grahakon se vasoolna baaki hai
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100/80">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 2: Collected Today */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/70 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase flex items-center gap-1">
                Aaj Ki Vasooli (Collected Today)
              </span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                ₹{summary.collectedToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                Aaj jama hua cash / online payment
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100/80">
              <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 3: Total Registered Customers */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                Kul Grahak (Registered Ledger)
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {summary.totalCustomers}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                Khata mein jode gaye active grahak
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold border border-slate-200">
              <User className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Master-Detail Split Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Customer List & Search */}
          <div
            className={`w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white border-r border-slate-200/80 flex-shrink-0 ${
              selectedCustomerId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search Input & Filter Tabs */}
            <div className="p-3 border-b border-slate-100 space-y-2.5 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Grahak ka naam ya 10-digit mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold pl-9 pr-8 py-2.5 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('dues')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    activeTab === 'dues'
                      ? 'bg-white text-rose-700 shadow-sm font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Baaki ({summary.customersWithDueCount})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sabhi ({summary.totalCustomers})
                </button>
                <button
                  onClick={() => setActiveTab('overdue')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    activeTab === 'overdue'
                      ? 'bg-white text-amber-700 shadow-sm font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overdue
                </button>
              </div>
            </div>

            {/* Customer List Scroll */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold animate-pulse space-y-3">
                  <div className="h-12 bg-slate-100 rounded-xl w-full" />
                  <div className="h-12 bg-slate-100 rounded-xl w-full" />
                  <div className="h-12 bg-slate-100 rounded-xl w-full" />
                </div>
              ) : customers.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Koi grahak nahi mila</p>
                  <p className="text-[11px] text-slate-400">
                    Naya khata shuru karne ke liye upar "- Udhaar Diya" dabayein
                  </p>
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const isDue = c.balance > 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`p-3.5 cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-inner'
                          : 'hover:bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                            isSelected
                              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                              : isDue
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name & Sub */}
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-black truncate ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {c.name}
                            </span>
                            {c.hasOverdue && (
                              <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.2 rounded-full">
                                LATE
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
                              isSelected ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            <span>{c.mobile}</span>
                            <span>•</span>
                            <span>{c.transactionCount} entries</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Balance Pill */}
                      <div className="text-right flex-shrink-0 pl-2">
                        <div
                          className={`text-xs font-black tracking-tight ${
                            isSelected
                              ? isDue
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                              : isDue
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {isDue ? `₹${c.balance.toLocaleString('en-IN')}` : '₹0.00'}
                        </div>
                        <span
                          className={`text-[10px] font-bold block ${
                            isSelected ? 'text-slate-400' : 'text-slate-400'
                          }`}
                        >
                          {isDue ? "Lene baaki" : "Barabar"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Detailed Passbook / Statement */}
          <div
            className={`flex-1 flex flex-col bg-slate-50/60 overflow-hidden ${
              !selectedCustomerId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {customerDetails ? (
              <>
                {/* Ledger Profile & Action Header */}
                <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex-shrink-0 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Customer Info */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedCustomerId(null)}
                        className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20">
                        {customerDetails.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-slate-900 tracking-tight">
                            {customerDetails.name}
                          </h2>
                          <button
                            onClick={() => {
                              setEditNameInput(customerDetails.name);
                              setEditLimitInput(String(customerDetails.creditLimit));
                              setShowEditCustomerModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Edit customer info"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
                          <a
                            href={`tel:${customerDetails.mobile}`}
                            className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 hover:underline"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{customerDetails.mobile}</span>
                          </a>
                          <span>•</span>
                          <span className="text-slate-500">
                            Limit: ₹{customerDetails.creditLimit.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Balance Banner & Action Icons */}
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Kul Baaki Hisaab
                        </span>
                        <span
                          className={`text-xl font-black ${
                            customerDetails.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ₹{customerDetails.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Reminder Button */}
                      {customerDetails.balance > 0 && (
                        <button
                          onClick={() => handleOpenReminderModal(customerDetails)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 fill-white" />
                          <span>WhatsApp Reminder</span>
                        </button>
                      )}

                      {/* Live UPI QR Button */}
                      {customerDetails.balance > 0 && (
                        <button
                          onClick={() => handleOpenQrModal(customerDetails.balance, customerDetails.name)}
                          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                          title="Generate payment QR code"
                        >
                          <QrCode className="w-4 h-4 text-emerald-400" />
                          <span>Show UPI QR</span>
                        </button>
                      )}

                      {/* Print Statement Button */}
                      <button
                        onClick={handlePrintStatement}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                        title="Print Account Statement"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Credit Limit Progress Bar */}
                  {customerDetails.creditLimit > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">
                          Credit Limit Used: {limitPercentage}%
                        </span>
                        <span
                          className={`font-black ${
                            limitPercentage >= 90
                              ? 'text-rose-600'
                              : limitPercentage >= 70
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          ₹{customerDetails.balance} / ₹{customerDetails.creditLimit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            limitPercentage >= 90
                              ? 'bg-rose-600'
                              : limitPercentage >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${limitPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Big Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleOpenAddModal('GIVE_CREDIT', customerDetails)}
                      className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>- Udhaar Diya (You Gave Goods/Cash)</span>
                    </button>
                    <button
                      onClick={() => handleOpenAddModal('PAYMENT_RECEIVED', customerDetails)}
                      className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+ Jama Mila (You Received Payment)</span>
                    </button>
                  </div>
                </div>

                {/* Printable Official Statement Section */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 print:p-0">
                  {/* Statement Container */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none">
                    {/* Header in Print Mode Only */}
                    <div className="hidden print:block p-6 border-b border-black text-center space-y-1">
                      <h2 className="text-xl font-black">{storeInfo?.name || 'Kirana Store'}</h2>
                      <p className="text-xs">{storeInfo?.phone ? `Phone: ${storeInfo.phone}` : ''} • Statement of Account</p>
                      <p className="text-xs font-bold mt-2">Customer: {customerDetails.name} ({customerDetails.mobile})</p>
                    </div>

                    {/* Table Column Titles */}
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 grid grid-cols-12 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <div className="col-span-5 md:col-span-5">Date & Particulars</div>
                      <div className="col-span-3 text-right text-rose-600">Udhaar Diya (-)</div>
                      <div className="col-span-3 text-right text-emerald-600">Jama Mila (+)</div>
                      <div className="col-span-1 text-right print:hidden">Action</div>
                    </div>

                    {/* Entries List */}
                    <div className="divide-y divide-slate-100">
                      {loadingDetails ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-bold animate-pulse">
                          Passbook update ho rahi hai...
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="p-14 text-center space-y-2">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            Is grahak ka koi purana lena-dena nahi hai
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Naya hisaab likhne ke liye upar diye gaye buttons ka upyog karein
                          </p>
                        </div>
                      ) : (
                        transactions.map((tx) => {
                          const isCredit = tx.type === 'GIVE_CREDIT';
                          return (
                            <div
                              key={tx.id}
                              className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/70 transition-all text-xs"
                            >
                              {/* Date & Note */}
                              <div className="col-span-5 md:col-span-5 min-w-0 pr-2">
                                <div className="font-black text-slate-900 truncate">
                                  {tx.description || (isCredit ? 'उधार सामान' : 'नगद भुगतान')}
                                </div>
                                <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>
                                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(tx.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                {tx.order?.billNumber && (
                                  <span className="inline-block mt-1 text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                    POS Bill #{tx.order.billNumber}
                                  </span>
                                )}
                              </div>

                              {/* Udhaar Diya (Gave) */}
                              <div className="col-span-3 text-right pr-2">
                                {isCredit ? (
                                  <span className="font-black text-rose-600 text-sm">
                                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">-</span>
                                )}
                              </div>

                              {/* Jama Mila (Got) */}
                              <div className="col-span-3 text-right pr-2">
                                {!isCredit ? (
                                  <span className="font-black text-emerald-600 text-sm">
                                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">-</span>
                                )}
                              </div>

                              {/* Action */}
                              <div className="col-span-1 text-right print:hidden">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="text-slate-300 hover:text-rose-600 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Statement Total Footer */}
                    <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 grid grid-cols-12 text-xs font-black">
                      <div className="col-span-5 text-slate-700">Total Net Balance:</div>
                      <div className="col-span-3 text-right text-rose-600">
                        ₹{customerDetails.totalGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-3 text-right text-emerald-600">
                        ₹{customerDetails.totalGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-1 print:hidden" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-black text-slate-800">Koi Grahak Chunein</h3>
                <p className="text-xs text-slate-500 max-w-sm font-medium">
                  Bayen (left) taraf se kisi bhi grahak par click karein unka poora hisaab dekhne, WhatsApp reminder bhejne aur UPI QR generate karne ke liye.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: ADD / RECORD TRANSACTION MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div
              className={`px-6 py-4 flex items-center justify-between text-white ${
                modalType === 'GIVE_CREDIT' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {modalType === 'GIVE_CREDIT' ? '🔴' : '🟢'}
                </span>
                <h3 className="text-base font-black tracking-tight">
                  {modalType === 'GIVE_CREDIT'
                    ? 'Udhaar Diya (You Gave Goods/Cash)'
                    : 'Payment Jama (You Received Payment)'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalType('GIVE_CREDIT')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    modalType === 'GIVE_CREDIT'
                      ? 'bg-rose-600 text-white font-black shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Udhaar Diya (-)
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('PAYMENT_RECEIVED')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    modalType === 'PAYMENT_RECEIVED'
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Jama Mila (+)
                </button>
              </div>

              {/* Customer Inputs */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                    Grahak Ka Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={customerMobileInput}
                    onChange={(e) => setCustomerMobileInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                    Grahak Ka Naam *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Sharma"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Amount Input & Quick Chips */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Raashi (Amount in ₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-black text-slate-400 text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-4 py-2.5 text-lg font-black text-slate-900 outline-none focus:border-slate-800"
                  />
                </div>

                {/* Quick Amount Pills */}
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {[100, 200, 500, 1000, 2000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => addQuickAmount(chip)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black cursor-pointer transition-colors"
                    >
                      +₹{chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Description / Saaman Ki Jankari
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5kg atta, dal, tel ya cash"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-800"
                />

                {/* Quick Note Pills */}
                <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1">
                  {modalType === 'GIVE_CREDIT'
                    ? ['राशन सामान', 'दूध व ब्रेड', 'तेल व आटा', 'महीने का उधार'].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setNotesInput(note)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer"
                        >
                          {note}
                        </button>
                      ))
                    : ['नगद कैश', 'PhonePe / GPay', 'बैंक ट्रांसफर'].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setNotesInput(note)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer"
                        >
                          {note}
                        </button>
                      ))}
                </div>
              </div>

              {/* Due Date (For Udhaar Diya) */}
              {modalType === 'GIVE_CREDIT' && (
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                    Payment Due Date (Kab tak dega?)
                  </label>
                  <input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-800"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[
                      { label: '3 Din', days: 3 },
                      { label: '7 Din', days: 7 },
                      { label: '15 Din', days: 15 },
                      { label: '1 Mahina', days: 30 },
                    ].map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setQuickDueDate(d.days)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-3 text-xs font-black text-white rounded-xl shadow-lg transition-all cursor-pointer ${
                    modalType === 'GIVE_CREDIT'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  {submitting ? 'Save ho raha hai...' : 'Hisaab Save Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: LIVE UPI QR CODE MODAL ─── */}
      {showQrModal && qrCodeDataUrl && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                📲 Live UPI Payment QR
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                {storeInfo?.name || 'Ramprasad Kirana Store'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </p>
            </div>

            {/* QR Code Canvas */}
            <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-inner inline-block mx-auto">
              <img src={qrCodeDataUrl} alt="UPI QR Code" className="w-56 h-56 mx-auto" />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              Bhugtan Raashi: <span className="text-emerald-700 font-black text-base">₹{customerDetails?.balance}</span>
            </div>

            <button
              onClick={() => {
                setShowQrModal(false);
                showToast('QR Code dismiss ho gaya', 'success');
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              Theek Hai (Close)
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: MULTI-TONE WHATSAPP REMINDER SHEET ─── */}
      {showReminderModal && customerDetails && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 fill-white" />
                <h3 className="text-base font-black tracking-tight">
                  WhatsApp Payment Reminder ({customerDetails.name})
                </h3>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tone Selection Tabs */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5">
                  Reminder Tone Chunein:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'gentle', label: '🙏 Vinamra (Gentle)' },
                    { id: 'firm', label: '⚠️ Tareekh Paar (Firm)' },
                    { id: 'detailed', label: '🧾 Detailed Hisaab' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedReminderTone(t.id as any)}
                      className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer border ${
                        selectedReminderTone === t.id
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-black shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Preview */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Message Preview (Bhejne se pehle badal bhi sakte hain):
                </label>
                <textarea
                  rows={6}
                  value={customReminderText}
                  onChange={(e) => setCustomReminderText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600 transition-all font-mono leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopyReminder}
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {copiedReminder ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedReminder ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: EDIT CUSTOMER LIMIT & DETAILS ─── */}
      {showEditCustomerModal && customerDetails && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Customer Details & Limit
              </h3>
              <button
                onClick={() => setShowEditCustomerModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  value={editLimitInput}
                  onChange={(e) => setEditLimitInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Is limit ke baad dukaandar ko warning milegi
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowEditCustomerModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.post('/customers', {
                      mobile: customerDetails.mobile,
                      name: editNameInput.trim(),
                    });
                    showToast('Customer update ho gaya!', 'success');
                    setShowEditCustomerModal(false);
                    fetchCustomerDetails(customerDetails.id);
                    fetchKhataData();
                  } catch (e) {
                    showToast('Update nahi ho paya', 'error');
                  }
                }}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
