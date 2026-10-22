'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { playSuccessSound, playErrorSound } from '@/lib/sounds';
import { io } from 'socket.io-client';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  Scan,
  User,
  Search,
  Trash2,
  Plus,
  Minus,
  Printer,
  Share2,
  LogOut,
  LayoutDashboard,
  Clock,
  ChevronDown,
  ShoppingCart,
  ArrowRight,
  CheckCircle,
  XCircle,
  X,
  Sparkles,
  ShoppingBag,
  Zap,
  Users,
  QrCode as QrCodeIcon,
  Check,
  Receipt,
  Keyboard,
  CreditCard,
  Banknote,
  BookOpen,
  ArrowUpRight,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  image: string | null;
  purchasePrice: string;
  sellingPrice: string;
  stock: string;
  unit: string;
  brand: string | null;
  gst: string;
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  creditBalance?: number;
  creditLimit?: number;
}

interface OnlineOrder {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'READY' | 'PICKED_UP' | 'CANCELLED';
  totalAmount: string;
  paymentMode: string;
  createdAt: string;
  customer: {
    name: string;
    mobile: string;
  };
  items: {
    id: string;
    quantity: string;
    price: string;
    product: {
      name: string;
      unit: string;
    };
  }[];
}

export default function PosPage() {
  const { user, store, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // Cart State
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('kos_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    setIsCartLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isCartLoaded) {
      localStorage.setItem('kos_cart', JSON.stringify(cart));
    }
  }, [cart, isCartLoaded]);

  // Input states & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; time: string; customerName?: string; cart: Record<string, CartItem>; total: number }>>([]);

  // Customer states
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Mobile cart sheet toggle (drawer)
  const [showMobileCart, setShowMobileCart] = useState(false);

  // UI state
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Online Orders Drawer State
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showOnlineDrawer, setShowOnlineDrawer] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState<'online' | 'recent'>('online');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Quick Add Item State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddBuyPrice, setQuickAddBuyPrice] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Refs for Autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerMobileRef = useRef<HTMLInputElement>(null);

  // Search Dropdown state
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);

  // Load products list
  useEffect(() => {
    fetchProducts();
    fetchOnlineOrders();

    const handleVoiceUpdate = (e: any) => {
      const updated = e.detail;
      if (updated && updated.id) {
        setProductsList((prev: Product[]) =>
          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );
      } else {
        fetchProducts();
      }
    };
    window.addEventListener('kiranaos:product-updated', handleVoiceUpdate);
    return () => window.removeEventListener('kiranaos:product-updated', handleVoiceUpdate);
  }, []);

  // Persistent focus on barcode input
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
        searchInputRef.current?.focus(); 
      }
    }, 100);
    return () => clearTimeout(focusTimer);
  }, []);

  // WebSockets real-time sync for online orders
  useEffect(() => {
    if (!store?.id || !user) return;
    if (typeof window === 'undefined') return;

    try {
      const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';
      if (!SOCKET_URL) return;

      const socket = io(SOCKET_URL, {
        query: { storeId: store.id },
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });

      socket.connect();

      socket.on('new-online-order', (onlineOrder: OnlineOrder) => {
        playSuccessSound();
        showToast(`New Online Order from ${onlineOrder.customer.name}!`, 'success');
        setOnlineOrders((prev) => [onlineOrder, ...prev]);
      });

      return () => {
        socket.disconnect();
      };
    } catch (e) {
      console.warn('Socket connection skipped in serverless mode');
    }
  }, [store, user]);

  // Autofocus handler
  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName !== 'INPUT' &&
      target.tagName !== 'SELECT' &&
      target.tagName !== 'BUTTON' &&
      target.tagName !== 'TEXTAREA' &&
      !target.closest('button') &&
      !target.closest('.modal-content')
    ) {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
        searchInputRef.current?.focus(); 
      }
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Cart Calculations
  const cartTotals = useMemo(() => {
    let subtotal = 0; 
    let totalTax = 0; 
    let totalItemsPrice = 0; 
    let itemCount = 0;
    let totalMrp = 0;

    Object.values(cart).forEach(({ product, quantity }) => {
      const price = Number(product.sellingPrice);
      const gstRate = Number(product.gst || 0);
      const mrp = Math.max(Number(product.purchasePrice || 0), Math.ceil((price * 1.25) / 10) * 10);

      const itemTotal = price * quantity;
      const basePrice = price / (1 + gstRate / 100);
      const itemGst = (price - basePrice) * quantity;
      const itemSubtotal = itemTotal - itemGst;

      subtotal += itemSubtotal;
      totalTax += itemGst;
      totalItemsPrice += itemTotal;
      totalMrp += mrp * quantity;
      itemCount += quantity;
    });

    const finalTotal = Math.max(0, totalItemsPrice - discount);
    const totalSavings = Math.max(0, totalMrp - finalTotal);

    return {
      subtotal,
      totalTax,
      totalItemsPrice,
      totalMrp,
      totalSavings,
      finalTotal,
      itemCount
    };
  }, [cart, discount]);

  // Dynamic UPI QR Code
  useEffect(() => {
    if (paymentMode === 'UPI' && cartTotals.finalTotal > 0) {
      const upiId = store?.upiId || 'kiranaos@okhdfcbank';
      const storeName = store?.name || 'Kirana Store';
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${cartTotals.finalTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill Payment')}`;
      QRCode.toDataURL(upiUrl, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then((url) => setUpiQrDataUrl(url))
        .catch((e) => console.error('QR code generation error', e));
    } else {
      setUpiQrDataUrl(null);
    }
  }, [paymentMode, cartTotals.finalTotal, store]);

  // Voice Billing listener
  useEffect(() => {
    const handleVoiceAddToCart = (event: any) => {
      const { product, quantity = 1 } = event.detail || {};
      if (!product) return;
      const key = product.barcode || product.id;
      setCart((prevCart) => {
        const existing = prevCart[key];
        playSuccessSound();
        if (existing) {
          return {
            ...prevCart,
            [key]: { ...existing, quantity: existing.quantity + quantity },
          };
        } else {
          return {
            ...prevCart,
            [key]: { product, quantity },
          };
        }
      });
      showToast(`🛒 ${quantity}x ${product.name} billed!`, 'success');
    };

    window.addEventListener('kirana_add_to_cart', handleVoiceAddToCart as any);
    return () => window.removeEventListener('kirana_add_to_cart', handleVoiceAddToCart as any);
  }, []);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        showToast('Search & Scanner Focused [F2]', 'success');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setQuickAddBarcode('');
        setShowQuickAddModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        discountInputRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setPaymentMode('CASH');
        showToast('Mode: CASH [F9]', 'success');
      } else if (e.key === 'F10') {
        e.preventDefault();
        setPaymentMode('UPI');
        showToast('Mode: UPI QR [F10]', 'success');
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        setShowSearchDropdown(false);
        setShowCustomerModal(false);
        setShowQuickAddModal(false);
        setShowReceipt(false);
        setCashTendered(null);
        if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
          searchInputRef.current?.focus(); 
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMode, discount, customer, cartTotals]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async (query = '') => {
    try {
      const response = await api.get(`/products?search=${query}`);
      setProductsList(response.data.data || []);
    } catch (e) {
      console.error('Failed to load products', e);
    }
  };

  const fetchOnlineOrders = async () => {
    try {
      const response = await api.get('/online-orders');
      setOnlineOrders(response.data.data || []);
    } catch (e) {
      console.error('Failed to fetch online orders', e);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await api.get('/orders');
      setRecentOrders(response.data.data || []);
    } catch (e) {
      console.error('Failed to fetch recent orders', e);
    }
  };

  useEffect(() => {
    if (showOnlineDrawer) {
      if (activeOrderTab === 'online') fetchOnlineOrders();
      else fetchRecentOrders();
    }
  }, [showOnlineDrawer, activeOrderTab]);

  const handleUpdateOnlineStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await api.put(`/online-orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${newStatus}`, 'success');
      playSuccessSound();
      fetchOnlineOrders();
      fetchProducts();
    } catch (err: any) {
      playErrorSound();
      showToast(err.response?.data?.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleGridProductTap = (product: Product) => {
    const key = product.barcode || product.id;
    setCart((prevCart) => {
      const existing = prevCart[key];
      playSuccessSound();
      if (existing) {
        return {
          ...prevCart,
          [key]: { ...existing, quantity: existing.quantity + 1 },
        };
      } else {
        return {
          ...prevCart,
          [key]: { product, quantity: 1 },
        };
      }
    });
  };

  const updateQuantity = (key: string, newQty: number) => {
    setCart((prevCart) => {
      if (newQty <= 0) {
        const next = { ...prevCart };
        delete next[key];
        return next;
      }
      return {
        ...prevCart,
        [key]: { ...prevCart[key], quantity: newQty },
      };
    });
  };

  const clearCart = () => {
    setCart({});
    setDiscount(0);
    setCashTendered(null);
    localStorage.removeItem('kos_cart');
    showToast('Cart cleared', 'success');
    if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
      searchInputRef.current?.focus(); 
    }
  };

  // Customer handlers
  const handleCustomerMobileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomerMobile(val);

    if (val.length === 10) {
      setSearchingCustomer(true);
      try {
        const res = await api.get(`/customers/mobile/${val}`);
        if (res.data?.data) {
          setCustomer(res.data.data);
          setCustomerName(res.data.data.name);
          setIsNewCustomer(false);
          setIsGuest(false);
          showToast(`Customer: ${res.data.data.name} attached!`, 'success');
        } else {
          setCustomer(null);
          setIsNewCustomer(true);
          setIsGuest(false);
        }
      } catch (err) {
        setCustomer(null);
        setIsNewCustomer(true);
        setIsGuest(false);
      } finally {
        setSearchingCustomer(false);
      }
    } else {
      setCustomer(null);
      setIsNewCustomer(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerMobile || !customerName) return;
    try {
      const res = await api.post('/customers', {
        mobile: customerMobile,
        name: customerName,
      });
      setCustomer(res.data.data);
      setIsNewCustomer(false);
      setIsGuest(false);
      showToast('Customer saved successfully', 'success');
      setShowCustomerModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create customer', 'error');
    }
  };

  const handleQuickAddProduct = async () => {
    if (!quickAddName || !quickAddPrice) {
      showToast('Name and Selling Price are required', 'error');
      return;
    }
    setIsQuickAdding(true);
    try {
      const payload = {
        name: quickAddName,
        barcode: quickAddBarcode || null,
        sellingPrice: quickAddPrice,
        purchasePrice: quickAddBuyPrice || quickAddPrice,
        stock: '100',
        unit: 'pc',
        gst: '0',
        storeId: store?.id
      };
      const res = await api.post('/products', payload);
      const newProduct = res.data.data;
      
      showToast('Product added successfully!', 'success');
      playSuccessSound();
      setShowQuickAddModal(false);
      setQuickAddName('');
      setQuickAddPrice('');
      setQuickAddBuyPrice('');
      setQuickAddBarcode('');
      
      fetchProducts();
      handleGridProductTap(newProduct);
    } catch (err: any) {
      playErrorSound();
      showToast(err.response?.data?.message || 'Failed to add product', 'error');
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Checkout submission
  const handleCheckout = async () => {
    const cartItemsList = Object.values(cart);
    if (cartItemsList.length === 0) {
      showToast('Cart is empty! Scan or select items.', 'error');
      playErrorSound();
      return;
    }

    if (paymentMode === 'CREDIT' && !customer && !customerMobile) {
      showToast('Udhaar ke liye Customer mobile zaroori hai!', 'error');
      playErrorSound();
      setShowCustomerModal(true);
      return;
    }

    setCheckingOut(true);
    try {
      let finalCustomerId = customer?.id || null;
      if (isNewCustomer && customerMobile && customerName) {
        const custRes = await api.post('/customers', {
          mobile: customerMobile,
          name: customerName,
        });
        finalCustomerId = custRes.data.data.id;
      }

      const orderPayload = {
        customerId: finalCustomerId,
        customerName: customerName || (customer ? customer.name : undefined),
        customerMobile: customerMobile || (customer ? customer.mobile : undefined),
        discount,
        paymentMode,
        subtotal: cartTotals.subtotal,
        gstAmount: cartTotals.totalTax,
        totalAmount: cartTotals.finalTotal,
        items: cartItemsList.map((item) => {
          const price = Number(item.product.sellingPrice);
          const gstRate = Number(item.product.gst || 0);
          const basePrice = price / (1 + gstRate / 100);
          const itemGst = (price - basePrice) * item.quantity;
          
          return {
            productId: item.product.id,
            quantity: item.quantity,
            price: price,
            gstRate: gstRate,
            gstAmount: itemGst
          };
        }),
      };

      const res = await api.post('/orders', orderPayload);
      const order = res.data.data;
      order.guestMobile = customerMobile;

      playSuccessSound();
      setLastOrder(order);
      setShowReceipt(true);
      setWhatsappSent(false);

      clearCart();
      setShowMobileCart(false);
      showToast('⚡ Order Completed! Bill Created.', 'success');
      fetchProducts();
    } catch (err: any) {
      playErrorSound();
      showToast(err.response?.data?.message || 'Checkout failed', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const triggerPrintReceipt = () => {
    window.print();
  };

  const triggerWhatsAppBill = () => {
    if (!lastOrder) return;
    const phone = lastOrder.customer?.mobile || lastOrder.guestMobile;
    if (!phone) {
      showToast('No customer phone attached', 'error');
      return;
    }

    try {
      const storeName = store?.name || 'KiranaOS';
      let message = `*🧾 Bill from ${storeName}*\n\n`;
      message += `Order ID: #${lastOrder.id.slice(0, 8)}\n`;
      message += `Date: ${new Date(lastOrder.createdAt).toLocaleDateString()}\n\n`;
      message += `*Items:*\n`;
      
      lastOrder.items.forEach((item: any) => {
        message += `• ${item.product?.name || 'Item'} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
      });
      
      const finalAmount = lastOrder.totalAmount - (lastOrder.discount || 0);
      message += `\n*Total: ₹${lastOrder.totalAmount}*`;
      if (lastOrder.discount && lastOrder.discount > 0) {
         message += `\nDiscount: ₹${lastOrder.discount}`;
         message += `\n*Final Amount: ₹${finalAmount}*`;
      }
      message += `\n\nThank you for shopping with us! 🙏`;

      const encodedMessage = encodeURIComponent(message);
      let finalPhone = phone.replace(/[^0-9]/g, '');
      if (finalPhone.length === 10) {
        finalPhone = `91${finalPhone}`;
      }
      
      const waUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
      window.open(waUrl, '_blank');
      
      showToast(`Opening WhatsApp for +${finalPhone}`, 'success');
      setWhatsappSent(true);
    } catch (e) {
      showToast('WhatsApp transmission failed', 'error');
    }
  };

  // Distinct categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    productsList.forEach((p) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return ['ALL', ...Array.from(set)];
  }, [productsList]);

  // Filtered products based on search & category
  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchQuery));

      const matchesCat =
        selectedCategory === 'ALL' ||
        (p.category?.name || 'Daily Essentials') === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [productsList, searchQuery, selectedCategory]);

  const pendingOnlineCount = onlineOrders.filter((o) => o.status === 'PENDING').length;

  if (authLoading || !user) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 font-sans antialiased overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[150] px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all transform animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success' 
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' 
                : 'bg-rose-950 text-rose-200 border-rose-500/40 shadow-rose-500/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Global POS Terminal Header */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 z-20 no-print">
          {/* Left: Terminal Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">Register 01</span>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-400 truncate max-w-[140px] font-medium">
                {store?.name || 'Kirana Counter'}
              </span>
            </div>

            <span className="hidden xl:inline text-xs text-slate-500 font-medium">
              Cashier: <b className="text-slate-300">{user.name}</b>
            </span>
          </div>

          {/* Center: Global Barcode Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative flex items-center">
              <Scan className="w-4 h-4 text-emerald-400 absolute left-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(e.target.value.trim() !== '');
                  setSearchSelectedIndex(0);
                }}
                onKeyDown={async (e) => {
                  const currentValue = e.currentTarget.value;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchSelectedIndex((prev) =>
                      prev < Math.min(filteredProducts.length, 10) - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                  } else if (e.key === 'Enter' && currentValue.trim() !== '') {
                    e.preventDefault();
                    if (showSearchDropdown && searchSelectedIndex >= 0 && searchSelectedIndex < filteredProducts.length) {
                      handleGridProductTap(filteredProducts[searchSelectedIndex]);
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                      setSearchSelectedIndex(-1);
                      return;
                    }

                    const cleanQuery = currentValue.trim();
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                    setSearchSelectedIndex(-1);

                    let matchedProduct = productsList.find((p) => p.barcode === cleanQuery);
                    if (!matchedProduct) {
                      try {
                        const res = await api.get(`/products/barcode/${cleanQuery}`);
                        if (res.data?.data) {
                          matchedProduct = res.data.data;
                        }
                      } catch (err) {}
                    }

                    if (matchedProduct) {
                      handleGridProductTap(matchedProduct);
                    } else {
                      playErrorSound();
                      setQuickAddBarcode(cleanQuery);
                      setShowQuickAddModal(true);
                    }
                  } else if (e.key === 'Escape') {
                    setShowSearchDropdown(false);
                  }
                }}
                placeholder="Scan Barcode or Search SKU / Name... [F2]"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-20 py-2.5 text-xs text-white placeholder-slate-500 font-medium outline-none transition-all shadow-inner"
              />
              <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                  F2
                </span>
              </div>
            </div>

            {/* Live Autocomplete Dropdown */}
            <AnimatePresence>
              {showSearchDropdown && searchQuery.trim() !== '' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden z-50 max-h-[360px] overflow-y-auto divide-y divide-slate-800/60"
                >
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 10).map((product, index) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          handleGridProductTap(product);
                          setSearchQuery('');
                          setShowSearchDropdown(false);
                          if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
                            searchInputRef.current?.focus(); 
                          }
                        }}
                        onMouseEnter={() => setSearchSelectedIndex(index)}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          searchSelectedIndex === index ? 'bg-emerald-500/10 text-white' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400">
                            {product.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{product.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Stock: {product.stock} {product.unit} • Barcode: {product.barcode || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-black text-emerald-400">
                            ₹{Number(product.sellingPrice).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-xs text-slate-400 font-medium">No matching SKU found for "{searchQuery}"</p>
                      <button
                        onClick={() => {
                          setQuickAddName(searchQuery);
                          setShowSearchDropdown(false);
                          setShowQuickAddModal(true);
                        }}
                        className="mt-2 text-xs font-bold text-emerald-400 hover:underline"
                      >
                        + Quick Add this product [F3]
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQuickAddBarcode('');
                setShowQuickAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Item [F3]</span>
            </button>

            <button
              onClick={() => {
                fetchOnlineOrders();
                setShowOnlineDrawer(true);
              }}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Orders</span>
              {pendingOnlineCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            {/* Mobile View Cart Drawer Pill */}
            <button
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Bill ({cartTotals.itemCount})</span>
            </button>

            <button
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts"
              className="hidden md:flex p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2-Column Split POS Workspace */}
        <div className="flex-1 flex overflow-hidden no-print">
          {/* LEFT COLUMN: Fast Product Grid & Category Filters */}
          <section className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            {/* Category Filter Pills Strip */}
            <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center gap-2 overflow-x-auto hide-scrollbar flex-shrink-0">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750 border border-slate-700/60'
                  }`}
                >
                  {cat === 'ALL' ? '📦 All Items' : cat}
                </button>
              ))}
              <span className="text-[11px] font-mono text-slate-500 ml-auto flex-shrink-0">
                {filteredProducts.length} items
              </span>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                    <Scan className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No items in this category</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Scan a barcode or use Quick Add to add products to your terminal catalog.
                  </p>
                  <button
                    onClick={() => {
                      setQuickAddBarcode('');
                      setShowQuickAddModal(true);
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    + Quick Add Product [F3]
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 pb-24 lg:pb-6">
                  {filteredProducts.map((p) => {
                    const cartQty = cart[p.barcode || p.id]?.quantity || 0;
                    const sellingPrice = Number(p.sellingPrice);
                    const stockNum = Number(p.stock);
                    const isLowStock = stockNum <= 5;

                    return (
                      <motion.div
                        key={p.id}
                        layout
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleGridProductTap(p)}
                        className={`bg-slate-900 rounded-2xl border transition-all p-3 flex flex-col justify-between cursor-pointer group hover:shadow-lg relative overflow-hidden ${
                          cartQty > 0
                            ? 'border-emerald-500/80 shadow-md shadow-emerald-500/10 bg-slate-900/90'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Top: Barcode chip & Stock Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[80px]">
                            {p.barcode ? `#${p.barcode}` : 'NO-BARCODE'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isLowStock 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {stockNum} left
                          </span>
                        </div>

                        {/* Middle: Product Info */}
                        <div className="flex-1 flex flex-col justify-center my-1">
                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium mt-1">
                            {p.unit || 'unit'} {p.brand ? `• ${p.brand}` : ''}
                          </span>
                        </div>

                        {/* Bottom: Price & Quick Stepper / Add Button */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
                          <div className="font-mono text-base font-black text-white">
                            ₹{sellingPrice.toFixed(0)}
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            {cartQty > 0 ? (
                              <div className="flex items-center bg-emerald-600 rounded-xl h-7 px-1 text-white shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(p.barcode || p.id, cartQty - 1)}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 rounded-lg text-white font-bold"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-black text-xs px-2">{cartQty}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(p.barcode || p.id, cartQty + 1)}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 rounded-lg text-white font-bold"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGridProductTap(p)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80 group-hover:border-emerald-500/40"
                              >
                                + ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: POS Register Tape & Checkout (Always open on Desktop) */}
          <aside className={`w-full lg:w-[440px] xl:w-[480px] bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 transition-all ${
            showMobileCart ? 'fixed inset-0 z-50 flex' : 'hidden lg:flex'
          }`}>
            {/* Register Tape Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Current Bill Tape</h3>
                <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {cartTotals.itemCount} items
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hold Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (cartTotals.itemCount === 0) return;
                    const newHeld = {
                      id: 'hold_' + Date.now(),
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      customerName: customerName || customer?.name || 'Walk-in',
                      cart: { ...cart },
                      total: cartTotals.finalTotal,
                    };
                    setHeldCarts((prev) => [newHeld, ...prev]);
                    setCart({});
                    playSuccessSound();
                    showToast('Bill park / hold ho gaya! [F8]', 'success');
                  }}
                  disabled={cartTotals.itemCount === 0}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Hold current cart to serve next customer"
                >
                  Hold [F8]
                </button>

                <button
                  onClick={clearCart}
                  disabled={cartTotals.itemCount === 0}
                  className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-40 transition-colors"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close button for Mobile Sheet */}
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Attachment Strip */}
            <div className="p-3.5 bg-slate-950/40 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      {customer ? customer.name : isGuest ? 'Walk-in Customer' : customerName || 'Unassigned'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {customer ? customer.mobile : customerMobile || 'Guest Checkout'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-colors"
                >
                  {customer ? 'Change [F4]' : '+ Grahak [F4]'}
                </button>
              </div>

              {/* Udhaar Alert Banner if customer has balance */}
              {customer && customer.creditBalance !== undefined && customer.creditBalance > 0 && (
                <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-rose-300">
                    ⚠️ Purana Udhaar: <b className="font-mono text-rose-400">₹{customer.creditBalance}</b>
                  </span>
                  <button
                    onClick={() => router.push('/credit')}
                    className="text-[10px] font-black text-rose-400 hover:underline"
                  >
                    Khata →
                  </button>
                </div>
              )}
            </div>

            {/* Itemized Scanned Tape List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {Object.keys(cart).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Receipt className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Register is Empty</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Scan a product or tap an item on the left.</p>
                </div>
              ) : (
                Object.entries(cart).map(([key, item]) => {
                  const price = Number(item.product.sellingPrice);
                  const itemTotal = price * item.quantity;

                  return (
                    <div
                      key={key}
                      className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-white truncate leading-tight">{item.product.name}</h5>
                        <span className="text-[10px] font-mono text-slate-400">
                          ₹{price.toFixed(0)} × {item.quantity} {item.product.unit || ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-800 rounded-lg h-7 px-1">
                          <button
                            onClick={() => updateQuantity(key, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs px-2 text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(key, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[60px]">
                          <span className="font-mono font-black text-sm text-emerald-400">
                            ₹{itemTotal.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Held / Parked Carts Bar */}
            {heldCarts.length > 0 && (
              <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" /> Held ({heldCarts.length}):
                </span>
                {heldCarts.map((h, idx) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setCart(h.cart);
                      setHeldCarts((prev) => prev.filter((_, i) => i !== idx));
                      playSuccessSound();
                      showToast(`Held cart (${h.customerName}) restored!`, 'success');
                    }}
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-mono font-bold shrink-0 flex items-center gap-1"
                  >
                    <span>{h.customerName}</span>
                    <b>₹{h.total.toFixed(0)}</b>
                  </button>
                ))}
              </div>
            )}

            {/* Billing Breakdown & Payment Methods Box */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 flex-shrink-0">
              {/* Calculations Subtotal / Discount / Total */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Subtotal</span>
                  <span>₹{cartTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>GST (Included)</span>
                  <span>₹{cartTotals.totalTax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-mono font-bold">
                    <span>Discount Applied</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                  <span className="text-xs font-black uppercase text-slate-300">Grand Total</span>
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    ₹{cartTotals.finalTotal.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                {[
                  { id: 'CASH', label: 'Cash [F9]' },
                  { id: 'UPI', label: 'UPI QR [F10]' },
                  { id: 'CREDIT', label: 'Udhaar' },
                  { id: 'CARD', label: 'Card' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id as any);
                      setCashTendered(null);
                    }}
                    className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      paymentMode === m.id
                        ? m.id === 'CREDIT'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Payment Specific Panels: UPI QR / Cash Calculator / Credit */}
              {paymentMode === 'UPI' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/30 flex items-center gap-3">
                  <div className="bg-white p-1 rounded-lg shrink-0">
                    {upiQrDataUrl ? (
                      <img src={upiQrDataUrl} alt="UPI QR" className="w-16 h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-slate-100">
                        <QrCodeIcon className="w-6 h-6 text-slate-800" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">
                      Counter QR Code Active
                    </span>
                    <span className="text-xs font-mono font-black text-white">
                      Scan to Pay ₹{cartTotals.finalTotal.toFixed(0)}
                    </span>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {store?.upiId || 'kiranaos@upi'}
                    </p>
                  </div>
                </div>
              )}

              {paymentMode === 'CASH' && (
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Tender:</span>
                    {[100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(amt)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          cashTendered === amt
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashTendered(cartTotals.finalTotal)}
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        cashTendered === cartTotals.finalTotal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Exact
                    </button>
                  </div>

                  {cashTendered !== null && cashTendered > cartTotals.finalTotal && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span>Wapas Karein (Return Change):</span>
                      <span className="font-mono text-emerald-400 text-sm">
                        ₹{(cashTendered - cartTotals.finalTotal).toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMode === 'CREDIT' && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs">
                  <span className="font-bold text-rose-300 block">
                    {customer ? `Khata Entry: ${customer.name}` : '⚠️ Customer mobile required for Udhaar'}
                  </span>
                  <p className="text-[10px] text-rose-400/80 mt-0.5">
                    This balance will be added to the customer's ledger automatically.
                  </p>
                </div>
              )}

              {/* Primary Charge Action Button */}
              <button
                onClick={handleCheckout}
                disabled={checkingOut || cartTotals.itemCount === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-between px-5 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <span className="font-mono">₹{cartTotals.finalTotal.toFixed(0)}</span>
                <span className="flex items-center gap-1.5 tracking-wide">
                  {checkingOut ? 'Processing...' : 'CHARGE & BILL [F12]'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          </aside>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-30 no-print">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {cartTotals.itemCount} items in cart
            </span>
            <span className="font-mono text-lg font-black text-emerald-400">
              ₹{cartTotals.finalTotal.toFixed(0)}
            </span>
          </div>

          <button
            onClick={() => setShowMobileCart(true)}
            disabled={cartTotals.itemCount === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg disabled:opacity-40"
          >
            <span>Review Bill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODALS */}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Grahak Chuney (Customer Info)
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Mobile Number (10 Digits)
                </label>
                <input
                  ref={customerMobileRef}
                  type="tel"
                  maxLength={10}
                  value={customerMobile}
                  onChange={handleCustomerMobileChange}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Grahak Ka Naam (Customer Name)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  disabled={customer !== null}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500 disabled:opacity-60"
                />
              </div>

              {isNewCustomer && (
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Save & Attach Customer
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsGuest(true);
                  setCustomer(null);
                  setCustomerName('');
                  setCustomerMobile('');
                  setShowCustomerModal(false);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs"
              >
                Continue as Walk-in (Guest)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Naya Product Jodein [F3]
              </h3>
              <button onClick={() => setShowQuickAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Barcode (Optional)</label>
                <input
                  type="text"
                  value={quickAddBarcode}
                  onChange={(e) => setQuickAddBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="e.g. Parle-G 100g"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={quickAddPrice}
                    onChange={(e) => setQuickAddPrice(e.target.value)}
                    placeholder="25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buy Price (₹)</label>
                  <input
                    type="number"
                    value={quickAddBuyPrice}
                    onChange={(e) => setQuickAddBuyPrice(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickAddProduct}
                disabled={isQuickAdding || !quickAddName || !quickAddPrice}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isQuickAdding ? 'Adding...' : 'Save & Add to Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Orders Drawer */}
      {showOnlineDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end no-print">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> Online Orders & History
              </h3>
              <button onClick={() => setShowOnlineDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveOrderTab('online')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 ${
                  activeOrderTab === 'online' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Online Orders ({onlineOrders.length})
              </button>
              <button
                onClick={() => setActiveOrderTab('recent')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 ${
                  activeOrderTab === 'recent' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Recent POS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeOrderTab === 'online' ? (
                onlineOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12">No online orders found.</p>
                ) : (
                  onlineOrders.map((o) => (
                    <div key={o.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-white">{o.customer?.name || 'Online Customer'}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{o.customer?.mobile}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-black text-emerald-400">
                        ₹{Number(o.totalAmount).toFixed(0)}
                      </div>
                      {o.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateOnlineStatus(o.id, 'APPROVED')}
                            className="flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateOnlineStatus(o.id, 'CANCELLED')}
                            className="bg-slate-800 text-slate-400 font-bold py-1.5 px-3 rounded-lg text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                recentOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12">No recent POS orders.</p>
                ) : (
                  recentOrders.map((r) => (
                    <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">#{r.billNumber || r.id.slice(0, 6)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-mono font-black text-emerald-400">
                        ₹{Number(r.totalAmount).toFixed(0)}
                      </span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">Bill Generated Successfully!</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">Bill #{lastOrder.billNumber || lastOrder.id.slice(0, 8)}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Total Amount:</span>
                <span className="text-white font-bold">₹{Number(lastOrder.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Mode:</span>
                <span className="text-emerald-400 font-bold">{lastOrder.paymentMode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerPrintReceipt}
                className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={triggerWhatsAppBill}
                className="bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>

            <button
              onClick={() => {
                setShowReceipt(false);
                if (typeof window !== "undefined" && window.innerWidth >= 1024) { 
                  searchInputRef.current?.focus(); 
                }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Next Customer (New Sale)
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-400" /> POS Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800">
              {[
                { key: 'F2', desc: 'Focus Barcode Scanner / Search' },
                { key: 'F3', desc: 'Quick Add Product' },
                { key: 'F4', desc: 'Attach / Change Customer' },
                { key: 'F8', desc: 'Hold / Park Current Bill' },
                { key: 'F9', desc: 'Select Cash Mode' },
                { key: 'F10', desc: 'Select UPI QR Mode' },
                { key: 'F12', desc: 'Complete Checkout (Charge)' },
                { key: 'Esc', desc: 'Clear search / Close modals' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between pt-2">
                  <span className="text-slate-300 font-medium">{s.desc}</span>
                  <span className="font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-bold">
                    {s.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Styled Printable Receipt */}
      {lastOrder && (
        <div className="print-only hidden p-6 text-black bg-white font-mono text-xs w-[80mm] leading-tight space-y-4">
          <div className="text-center">
            <h2 className="text-base font-extrabold">{store?.name || 'KiranaOS Store'}</h2>
            <p>{store?.address}</p>
            {store?.phone && <p>Tel: +91 {store.phone}</p>}
            {store?.gstin && <p>GSTIN: {store.gstin}</p>}
            <p className="border-t border-dashed border-black mt-2 pt-2">TAX INVOICE</p>
          </div>
          <div className="space-y-1">
            <p><b>Bill No:</b> {lastOrder.billNumber}</p>
            <p><b>Date:</b> {new Date(lastOrder.createdAt).toLocaleString()}</p>
            <p><b>Billed By:</b> {lastOrder.user?.name || user.name}</p>
            {lastOrder.customer && (
              <div className="border-t border-dashed border-black mt-1 pt-1">
                <p><b>Cust Mobile:</b> {lastOrder.customer.mobile}</p>
                <p><b>Cust Name:</b> {lastOrder.customer.name}</p>
              </div>
            )}
          </div>
          <table className="w-full border-t border-b border-dashed border-black my-2 py-2">
            <thead>
              <tr className="text-left font-bold border-b border-black">
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {lastOrder.items?.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.product?.name}</td>
                  <td className="text-right">{Number(item.quantity)}</td>
                  <td className="text-right">₹{Number(item.price).toFixed(2)}</td>
                  <td className="text-right">₹{(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 text-right">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{Number(lastOrder.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (Incl):</span>
              <span>₹{Number(lastOrder.gstAmount).toFixed(2)}</span>
            </div>
            {Number(lastOrder.discount) > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{Number(lastOrder.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
              <span>Total Paid:</span>
              <span>₹{Number(lastOrder.totalAmount).toFixed(2)}</span>
            </div>
          </div>
          <div className="text-center border-t border-dashed border-black mt-4 pt-4 space-y-1">
            <p>Payment Mode: <b>{lastOrder.paymentMode}</b></p>
            <p className="font-bold text-xs mt-2">Thank you! Visit again.</p>
            <p className="text-[9px] text-gray-600">Powered by KiranaOS</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only {
            display: block !important;
            margin: 0; padding: 0;
            background: white !important; color: black !important;
            width: 80mm !important; max-width: 80mm !important;
          }
          body, html { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
