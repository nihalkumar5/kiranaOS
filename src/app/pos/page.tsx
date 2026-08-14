'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { playSuccessSound, playErrorSound } from '@/lib/sounds';
import { io } from 'socket.io-client';
import Logo from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
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
  Users
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

  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'MIXED'>('CASH');

  // Customer states
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const enableBillMode = () => {
    if (!customerMobile && !isGuest && !customer) {
      setShowCustomerModal(true);
    } else {
      setIsBillMode(true);
    }
  };

  // UI state
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

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

  // Bill Mode State
  const [isBillMode, setIsBillMode] = useState(false);

  // Refs for Autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerMobileRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load products list for grid selection
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOnlineOrders();
    }
  }, [user]);

  // Persistent focus on barcode input
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(focusTimer);
  }, []);

  // Optional WebSockets real-time sync for online orders
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

  // Autofocus handler on window blur/click
  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName !== 'INPUT' &&
      target.tagName !== 'SELECT' &&
      target.tagName !== 'BUTTON' &&
      !target.closest('button') &&
      !target.closest('.modal-content')
    ) {
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        searchInputRef.current?.focus();
        showToast('Input refocused', 'success');
      } else if (e.key === 'F8') {
        e.preventDefault();
        discountInputRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        const modes: ('CASH' | 'UPI' | 'CARD' | 'MIXED')[] = ['CASH', 'UPI', 'CARD', 'MIXED'];
        const nextIndex = (modes.indexOf(paymentMode) + 1) % modes.length;
        setPaymentMode(modes[nextIndex]);
        showToast(`Payment Mode: ${modes[nextIndex]}`, 'success');
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMode, discount, customer]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async (query = '') => {
    try {
      const response = await api.get(`/products?search=${query}`);
      setProductsList(response.data.data);
    } catch (e) {
      console.error('Failed to load products', e);
    }
  };

  const fetchOnlineOrders = async () => {
    try {
      const response = await api.get('/online-orders');
      setOnlineOrders(response.data.data);
    } catch (e) {
      console.error('Failed to fetch online orders', e);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await api.get('/orders');
      setRecentOrders(response.data.data);
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

  const handleBarcodeSubmit = async (barcodeValue: string) => {
    const cleanBarcode = barcodeValue.trim();
    if (!cleanBarcode) return;

    setSearchQuery(''); 
    searchInputRef.current?.focus();

    try {
      const response = await api.get(`/products/barcode/${cleanBarcode}`);
      const product: Product = response.data.data;

      setCart((prevCart) => {
        const existing = prevCart[cleanBarcode];
        if (existing) {
          playSuccessSound();
          return {
            ...prevCart,
            [cleanBarcode]: {
              ...existing,
              quantity: existing.quantity + 1,
            },
          };
        } else {
          playSuccessSound();
          return {
            ...prevCart,
            [cleanBarcode]: {
              product,
              quantity: 1,
            },
          };
        }
      });
      setIsBillMode(true);
    } catch (err: any) {
      playErrorSound();
      showToast('Product not found.', 'error');
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
    enableBillMode();
    searchInputRef.current?.focus();
  };

  const updateQuantity = (key: string, qty: number) => {
    if (qty <= 0) {
      removeCartItem(key);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [key]: { ...prev[key], quantity: qty },
    }));
    searchInputRef.current?.focus();
  };

  const removeCartItem = (key: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    searchInputRef.current?.focus();
  };

  const clearCart = () => {
    setCart({});
    setDiscount(0);
    setCustomer(null);
    setCustomerMobile('');
    setCustomerName('');
    setIsNewCustomer(false);
    searchInputRef.current?.focus();
  };

  const handleCustomerMobileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerMobile(val);
    setIsNewCustomer(false);
    setCustomer(null);

    if (val.length === 10) {
      setSearchingCustomer(true);
      try {
        const res = await api.get(`/customers/mobile/${val}`);
        setCustomer(res.data.data);
        setCustomerName(res.data.data.name);
        showToast(`Customer connected: ${res.data.data.name}`, 'success');
      } catch (err) {
        setIsNewCustomer(true);
        setCustomerName('');
        showToast('New Customer! Please fill in their name.', 'success');
      } finally {
        setSearchingCustomer(false);
      }
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
      showToast('Customer registered successfully', 'success');
      searchInputRef.current?.focus();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create customer', 'error');
    }
  };

  const handleEditCustomer = () => {
    setCustomer(null);
    setIsNewCustomer(true);
    customerMobileRef.current?.focus();
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
        stock: '100', // Default stock
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
      
      // Refresh products
      fetchProducts();
      
      // Automatically add to cart
      handleGridProductTap(newProduct);
    } catch (err: any) {
      playErrorSound();
      showToast(err.response?.data?.message || 'Failed to add product', 'error');
    } finally {
      setIsQuickAdding(false);
    }
  };

  const cartTotals = useMemo(() => {
    let subtotal = 0; 
    let totalTax = 0; 
    let totalItemsPrice = 0; 
    let itemCount = 0;
    let totalMrp = 0;

    Object.values(cart).forEach(({ product, quantity }) => {
      const price = Number(product.sellingPrice);
      const gstRate = Number(product.gst);
      const mrp = Math.max(Number(product.purchasePrice || 0), Math.ceil((price * 1.25)/10)*10);

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

  const handleCheckout = async () => {
    const cartItemsList = Object.values(cart);
    if (cartItemsList.length === 0) {
      showToast('Cart is empty', 'error');
      playErrorSound();
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
        discount,
        paymentMode,
        items: cartItemsList.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await api.post('/orders', orderPayload);
      const order = res.data.data;
      order.guestMobile = customerMobile; // Persist for WhatsApp

      playSuccessSound();
      setLastOrder(order);
      setShowReceipt(true);
      setWhatsappSent(false);

      clearCart();
      showToast('Order saved successfully!', 'success');
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

  const filteredProducts = productsList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery))
  );

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const catName = p.category?.name || 'Daily Essentials';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    });
    return Array.from(map.entries());
  }, [filteredProducts]);

  const pendingOnlineCount = onlineOrders.filter((o) => o.status === 'PENDING').length;

  if (authLoading || !user) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] text-zinc-900 font-sans antialiased overflow-hidden">
      {/* Toast Notification (Sleek Card on Right Side) */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-[320px] px-4 py-3 rounded-xl shadow-2xl border text-[13px] font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-white border-l-4 border-l-[#059669] border-y-gray-100 border-r-gray-100 text-slate-800' : 'bg-white border-l-4 border-l-red-500 border-y-gray-100 border-r-gray-100 text-slate-800'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-[#f0fdf4] text-[#059669]' : 'bg-red-50 text-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
          </div>
          <span className="leading-tight">{toast.message}</span>
        </div>
      )}

      {/* POS Header with Glassmorphism */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/20 h-20 sticky top-0 z-30 flex items-center justify-between px-6 no-print shadow-[0_4px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 pr-6 py-2">
            <h1><Logo suffix="POS" size="md" /></h1>
          </div>
          <div className="flex flex-col">
            <h3 className="font-extrabold text-[14px] text-gray-900">{store?.name || 'KiranaOS Terminal'}</h3>
            <div className="text-[12px] text-gray-500 font-medium flex gap-2">
              <span>Cashier: {user.name}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-[600px] relative mx-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full blur opacity-0 group-focus-within:opacity-10 transition duration-500"></div>
          <Search className="w-5 h-5 text-zinc-400 absolute left-5 top-[15px] z-10" />
          <input
            autoFocus
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onKeyDown={async (e) => {
              const currentValue = e.currentTarget.value;
              if (e.key === 'Enter' && currentValue.trim() !== '') {
                e.preventDefault();
                const cleanQuery = currentValue.trim();
                setSearchQuery('');
                
                let matchedProduct = productsList.find(p => p.barcode === cleanQuery);
                
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
              }
            }}
            placeholder='Search or Scan Barcode...'
            className="w-full bg-gray-50/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:border-zinc-300 focus:ring-4 focus:ring-zinc-500/10 rounded-full pl-14 pr-6 py-3.5 text-[15px] font-bold focus:outline-none transition-all placeholder-gray-400 text-gray-900 shadow-inner relative z-0"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setQuickAddBarcode('');
              setShowQuickAddModal(true);
            }}
            className="flex items-center gap-2 bg-[#059669] hover:bg-green-700 border border-transparent px-4 py-2.5 rounded-full text-sm font-bold text-white transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Quick Add</span>
          </button>
          <button
            onClick={() => {
              fetchOnlineOrders();
              setShowOnlineDrawer(true);
            }}
            className="relative flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full text-sm font-bold text-gray-700 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-zinc-800" />
            Orders
            {pendingOnlineCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[10px] font-black w-5 h-5 flex items-center justify-center border-2 border-white animate-pulse">
                {pendingOnlineCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (isBillMode) {
                setIsBillMode(false);
              } else {
                enableBillMode();
              }
            }}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${isBillMode ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-900/10'}`}
          >
            <ShoppingCart className="w-4 h-4" />
            {isBillMode ? 'Close Bill' : 'Bill Mode'}
            {Object.keys(cart).length > 0 && !isBillMode && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-400 text-white rounded-full text-[10px] font-black w-5 h-5 flex items-center justify-center border-2 border-white">
                {cartTotals.itemCount}
              </span>
            )}
          </button>

          {user.role === 'ADMIN' && (
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-semibold text-sm">
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-2 text-red-400 hover:text-red-600 font-semibold text-sm ml-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden no-print relative">
        {/* Left Side: E-Commerce View */}
        <section className={`flex-1 overflow-y-auto bg-white md:border-r border-gray-100 pb-20 md:pb-0 ${isBillMode ? 'hidden md:block' : 'block'}`}>
          <div className="max-w-[1200px] mx-auto px-6 py-6 pb-24">
            
            {!searchQuery && !isBillMode && (
              <div className="mb-8">
                {/* Blinkit-style Hero Banner */}
                <div className="relative w-full h-[260px] mb-8 rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
                  <img src="/g1.jpg" alt="Promo Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-16 w-full md:w-2/3">
                    <h2 className="text-[42px] font-black text-white leading-tight mb-3 drop-shadow-md tracking-tight">Stock up on daily essentials</h2>
                    <p className="text-white text-xl font-medium mb-8 drop-shadow-sm leading-snug">Get farm-fresh goodness & a range of exotic fruits, vegetables, eggs & more</p>
                    <div>
                       <button className="bg-white text-green-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition shadow-sm text-sm">Shop Now</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {/* Kirana Grocery Banner */}
                  <div className="relative w-full h-36 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 bg-[#059669]">
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <img src="https://images.unsplash.com/photo-1596422846543-75c6fc197f0a?w=400&h=400&fit=crop" className="h-[120%] w-auto object-cover absolute mix-blend-luminosity right-[-10px] opacity-60" />
                    </div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-center w-[75%]">
                      <h3 className="text-white font-black text-[22px] leading-tight mb-1">Authentic Indian Grocery</h3>
                      <p className="text-white/90 text-xs font-medium mb-3">Spices, pulses, rice & daily essentials</p>
                      <div>
                        <button className="bg-white text-[#059669] px-4 py-1.5 rounded-md font-bold text-[12px] shadow-sm">Shop Now</button>
                      </div>
                    </div>
                  </div>
                  {/* Fresh Dairy & Eggs Banner */}
                  <div className="relative w-full h-36 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 bg-[#f8b133]">
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <img src="https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop" className="h-[120%] w-auto object-cover absolute mix-blend-multiply right-[-10px]" />
                    </div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-center w-[70%]">
                      <h3 className="text-zinc-900 font-black text-[22px] leading-tight mb-1">Fresh Dairy & Morning Needs</h3>
                      <p className="text-zinc-800/90 text-xs font-medium mb-3">Milk, paneer, curd & fresh eggs</p>
                      <div>
                        <button className="bg-zinc-800 text-white px-4 py-1.5 rounded-md font-bold text-[12px] shadow-sm">Shop Now</button>
                      </div>
                    </div>
                  </div>
                  {/* Snacks & Namkeen Banner */}
                  <div className="relative w-full h-36 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 bg-[#e32c2b]">
                    <div className="absolute inset-0 flex items-center justify-end">
                      <img src="https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop" className="h-[140%] w-auto object-cover right-[-20px] absolute mix-blend-multiply opacity-80" />
                    </div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-center w-2/3">
                      <h3 className="text-white font-black text-[22px] leading-tight mb-1">Snacks & Namkeen</h3>
                      <p className="text-white/90 text-xs font-medium mb-3">Chips, biscuits & sweet cravings</p>
                      <div>
                        <button className="bg-white text-[#e32c2b] px-4 py-1.5 rounded-md font-bold text-[12px] shadow-sm">Shop Now</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!searchQuery && (
              <div className="mb-12">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#059669]" />
                  Shop by Category
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
                  {[
                    {name: 'Paan Corner', img: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=200&h=200&fit=crop'},
                    {name: 'Dairy, Bread & Eggs', img: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop'},
                    {name: 'Fruits & Vegetables', img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop'},
                    {name: 'Cold Drinks & Juices', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop'},
                    {name: 'Snacks & Munchies', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&h=200&fit=crop'},
                    {name: 'Breakfast & Instant', img: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=200&h=200&fit=crop'},
                    {name: 'Sweet Tooth', img: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=200&h=200&fit=crop'},
                    {name: 'Bakery & Biscuits', img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop'},
                    {name: 'Personal Care', img: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=200&h=200&fit=crop'},
                    {name: 'Home Care', img: 'https://images.unsplash.com/photo-1584820927498-cafe2c11818e?w=200&h=200&fit=crop'},
                  ].map((cat, i) => (
                    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }} key={i} className="flex flex-col items-center gap-3 cursor-pointer group">
                      <div className="w-[88px] h-[88px] mx-auto bg-[#f4f6f9] rounded-[20px] overflow-hidden flex items-center justify-center shadow-sm border border-gray-100 group-hover:shadow-md group-hover:border-[#059669]/40 transition-all">
                        <img src={cat.img} alt={cat.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <span className="font-bold text-[13px] text-zinc-700 text-center leading-tight tracking-tight px-1 group-hover:text-[#059669] transition-colors">{cat.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.length === 0 ? (
               <div className="py-20 flex flex-col items-center">
                 <div className="bg-gray-50 p-4 rounded-full mb-3 border border-gray-100">
                   <Scan className="w-8 h-8 text-gray-300" />
                 </div>
                 <p className="text-gray-500 font-medium">Scan an item or use the search bar</p>
               </div>
            ) : (
              <div className="space-y-10">
                {productsByCategory.map(([categoryName, catProducts]) => (
                  <div key={categoryName} className="flex flex-col">
                    <div className="flex justify-between items-end mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{categoryName}</h2>
                      <button className="text-[#059669] font-bold text-sm hover:underline">see all</button>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide">
                      {catProducts.map((p) => {
                        const isOutOfStock = false; // ALLOW NEGATIVE STOCK
                        const showLowStock = Number(p.stock) <= 0;
                        const cartQty = cart[p.barcode || p.id]?.quantity || 0;
                        const sellingPrice = Number(p.sellingPrice);
                        // Mock MRP Calculation for UI purposes
                        const mrp = Math.max(Number(p.purchasePrice || 0), Math.ceil((sellingPrice * 1.25)/10)*10);
                        const discount = mrp - sellingPrice;

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -2, boxShadow: "0 10px 20px -10px rgba(0,0,0,0.05)" }}
                            key={p.id}
                            onClick={() => {
                                handleGridProductTap(p);
                            }}
                            className={`w-[150px] flex-shrink-0 bg-white border border-gray-200 rounded-[12px] flex flex-col hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer`}
                          >
                            <div className="h-[120px] w-full flex items-center justify-center relative bg-gray-50/50 border-b border-gray-100 overflow-hidden">
                              {p.image ? (
                                <motion.img whileHover={{ scale: 1.05 }} src={p.image} className="object-cover w-full h-full mix-blend-multiply transition-transform duration-500 ease-out" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-800 bg-gray-50 rounded-lg">
                                  <span className="font-normal text-3xl tracking-tight">{p.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                              )}
                            </div>



                            <div className="flex-1 flex flex-col p-2.5">
                              <h4 className="font-semibold text-slate-800 text-[13px] leading-snug line-clamp-2 min-h-[38px] tracking-tight">{p.name}</h4>
                              <p className="text-[12px] font-medium text-slate-500 mt-1 mb-3">{p.unit} {showLowStock && <span className="text-orange-500 font-bold ml-1">(Stock: {Number(p.stock)})</span>}</p>

                              <div className="flex items-end justify-between mt-auto">
                                  <div className="flex flex-col justify-end">
                                    <div className="font-bold text-[14px] text-gray-900 leading-none mb-1">
                                      ₹{sellingPrice.toFixed(0)}
                                    </div>
                                    {discount > 0 && (
                                      <div className="text-[10px] text-slate-500 font-medium leading-none">
                                        MRP <span className="line-through">₹{mrp.toFixed(0)}</span>
                                      </div>
                                    )}
                                  </div>

                                <div className="flex-shrink-0">
                                  {cartQty > 0 ? (
                                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center bg-[#f3fbf4] border border-[#059669] text-[#059669] rounded-lg overflow-hidden text-sm font-medium h-[32px] w-[64px]" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => updateQuantity(p.barcode || p.id, cartQty - 1)} className="flex-1 flex justify-center items-center h-full hover:bg-[#e4f6e6] transition-colors">
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="flex-1 text-center select-none text-[12px] font-bold">{cartQty}</span>
                                      <button onClick={() => updateQuantity(p.barcode || p.id, cartQty + 1)} className="flex-1 flex justify-center items-center h-full hover:bg-[#e4f6e6] transition-colors">
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </motion.div>
                                  ) : (
                                    <button
                                      className="bg-white border border-[#059669] text-[#059669] hover:bg-[#f3fbf4] font-bold h-[32px] w-[64px] rounded-lg text-[11px] uppercase transition-colors flex justify-center items-center tracking-wider shadow-sm"
                                    >
                                      ADD
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: The Cashier Cart Panel (Blinkit style cart) */}
        {isBillMode && (
        <section className="w-full md:w-[480px] bg-[#f4f6f9] md:border-l border-gray-200 flex flex-col z-20 h-full flex-shrink-0 shadow-[inset_4px_0_24px_rgba(0,0,0,0.02)] absolute md:relative inset-0 pb-20 md:pb-0">
          {/* Cart Header */}
          <div className="bg-[#1e293b] px-5 py-4 flex items-center justify-between border-b border-slate-700/50 shadow-sm z-10">
            <div>
              <h2 className="text-lg font-black text-white">Cart</h2>
              <p className="text-[11px] text-slate-400 font-medium">KiranaOS POS Mode • Scan to add</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQuickAddBarcode('');
                  setShowQuickAddModal(true);
                }}
                className="text-xs font-bold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
              <button onClick={clearCart} className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>

          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">
            
            {/* Delivery/POS info tag */}
            <div className="bg-white rounded-[16px] p-3 flex shadow-sm border border-gray-100 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#f0fdf4] rounded-[10px] w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-[#059669]" />
                </div>
                <h3 className="font-bold text-[15px] text-slate-900 leading-tight">Instant Store Checkout</h3>
              </div>
              <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                <p className="text-[12px] font-bold text-slate-600">{cartTotals.itemCount} items</p>
              </div>
            </div>

            {/* Customer Box (Moved to top) */}
            <div className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-gray-900 text-[13px]">Customer Info</h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Name"
                  disabled={customer !== null}
                  className="bg-gray-50 border border-gray-200 focus:border-[#059669] rounded-lg px-3 py-2.5 text-[12px] text-gray-900 focus:outline-none transition-all placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <input
                  ref={customerMobileRef}
                  type="text"
                  value={customerMobile}
                  onChange={handleCustomerMobileChange}
                  placeholder="Mobile"
                  disabled={customer !== null}
                  className="bg-gray-50 border border-gray-200 focus:border-[#059669] rounded-lg px-3 py-2.5 text-[12px] text-gray-900 focus:outline-none transition-all placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              {customer === null && (
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  className="w-full bg-green-50 text-[#059669] font-bold py-2 rounded-lg text-xs hover:bg-[#e4f6e6] transition-colors"
                >
                  Save Customer
                </button>
              )}
              {customer !== null && (
                <button
                  type="button"
                  onClick={handleEditCustomer}
                  className="w-full bg-gray-50 text-gray-600 font-bold py-2 rounded-lg text-xs hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  Edit Customer Info
                </button>
              )}


            </div>

            {/* Product List */}
            {Object.keys(cart).length === 0 ? (
               <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-8 text-center flex flex-col items-center justify-center h-48">
                 <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mb-3">
                   <Scan className="w-8 h-8 text-gray-300" />
                 </div>
                 <h4 className="font-bold text-gray-800 text-sm">Cart is empty</h4>
                 <p className="text-xs text-gray-500 mt-1">Scan a barcode to instantly add items here.</p>
               </div>
            ) : (
              <div className="bg-white rounded-[16px] p-2 shadow-sm border border-gray-100 divide-y divide-gray-100">
                {Object.entries(cart).map(([key, item]) => {
                  const sellingPrice = Number(item.product.sellingPrice);
                  const mrp = Math.max(Number(item.product.purchasePrice || 0), Math.ceil((sellingPrice * 1.25)/10)*10);
                  
                  return (
                  <div key={key} className="flex gap-3 py-3 px-2">
                    <div className="w-[50px] h-[50px] flex-shrink-0 flex items-center justify-center overflow-hidden rounded-[8px] bg-white border border-gray-100">
                      {item.product.image ? (
                        <img src={item.product.image} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full rounded-[8px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold text-[12px]">
                          {item.product.name.substring(0,2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h5 className="font-semibold text-[13px] text-gray-800 leading-snug line-clamp-2">{item.product.name}</h5>
                      <span className="text-[12px] text-gray-500 mt-0.5">{item.product.unit} ×{item.quantity}</span>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="bg-[#059669] text-white font-mono font-bold text-[16px] px-2 py-0.5 rounded-md shadow-sm tracking-tighter leading-none">
                            ₹{sellingPrice.toFixed(0)}
                          </div>
                          <span className="text-[11px] font-mono text-gray-500 line-through decoration-gray-400 font-medium leading-none">
                            ₹{mrp.toFixed(0)}
                          </span>
                        </div>
                        
                        <div className="flex items-center bg-white border border-[#059669] text-[#059669] rounded-md overflow-hidden text-sm font-medium h-7 w-[64px]">
                          <button onClick={() => updateQuantity(key, item.quantity - 1)} className="flex-1 flex justify-center items-center h-full hover:bg-[#f3fbf4] transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center select-none text-[12px] font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(key, item.quantity + 1)} className="flex-1 flex justify-center items-center h-full hover:bg-[#f3fbf4] transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Bill Details */}
            {Object.keys(cart).length > 0 && (
              <div className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 text-[13px] mb-3">Bill Details</h3>
                <div className="space-y-2.5 text-[12px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{cartTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST Tax</span>
                    <span>₹{cartTotals.totalTax.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#059669] font-medium">
                      <span>Discount [F8]</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {cartTotals.totalSavings > 0 && (
                    <div className="flex justify-between text-[#059669] font-medium pt-2 pb-1 border-t border-dashed border-gray-200">
                      <span>Total Savings</span>
                      <span>-₹{cartTotals.totalSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-gray-900 text-[14px] pt-3 border-t border-gray-100">
                    <span>Grand total</span>
                    <span>₹{cartTotals.finalTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Input */}
            {Object.keys(cart).length > 0 && (
              <div className="bg-white rounded-[16px] p-3 shadow-sm border border-gray-100 mt-4">
                 <input
                  id="discount-input"
                  ref={discountInputRef}
                  type="number"
                  min="0"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="Discount ₹ (F8)"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#059669] rounded-lg px-3 py-2.5 text-[12px] text-gray-900 focus:outline-none transition-all placeholder-gray-400"
                />
              </div>
            )}

            {/* Checkout Bottom Panel (Now flows with content) */}
            {Object.keys(cart).length > 0 && (
              <div className="bg-white border border-gray-200 p-4 rounded-[16px] shadow-sm z-10 mt-4">
                <div className="flex gap-1 mb-4 bg-gray-900 p-1.5 rounded-xl shadow-inner relative overflow-hidden">
                  {['CASH', 'UPI', 'CARD'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode as any)}
                      className={`relative flex-1 py-2.5 rounded-lg font-bold text-[12px] tracking-wider transition-all duration-300 z-10 ${
                        paymentMode === mode 
                          ? 'text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] bg-emerald-500 scale-[1.02]' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || cartTotals.itemCount === 0}
                  className="w-full bg-[#059669] active:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl text-[14px] transition-all flex items-center justify-between px-5 shadow-sm"
                >
                  <span>₹{cartTotals.finalTotal.toFixed(0)}</span>
                  <span className="flex items-center gap-1">Place Order [F12] <ArrowRight className="w-4 h-4" /></span>
                </button>
              </div>
            )}
          </div>
        </section>
        )}

        {/* POS Mobile Bottom Nav (Hidden on Desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] flex items-center justify-around px-2 py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
            <button
              onClick={() => setIsBillMode(false)}
              className={`flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-colors ${!isBillMode ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className={`p-1.5 rounded-full ${!isBillMode ? 'bg-green-50' : ''}`}>
                 <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className={`text-[10px] tracking-tight ${!isBillMode ? 'font-bold' : 'font-medium'}`}>Products</span>
            </button>
            <button
              onClick={() => {
                setIsBillMode(false);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
            >
              <div className="p-1.5 rounded-full">
                 <Scan className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight font-medium">Scan</span>
            </button>
            <button
              onClick={() => {
                fetchOnlineOrders();
                setShowOnlineDrawer(true);
              }}
              className="relative flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
            >
              <div className="p-1.5 rounded-full relative">
                 <ShoppingBag className="w-5 h-5" />
                 {pendingOnlineCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center border border-white">
                      {pendingOnlineCount}
                    </span>
                  )}
              </div>
              <span className="text-[10px] tracking-tight font-medium">Orders</span>
            </button>
            <button
              onClick={() => enableBillMode()}
              className={`relative flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-colors ${isBillMode ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className={`p-1.5 rounded-full relative ${isBillMode ? 'bg-green-50' : ''}`}>
                 <ShoppingCart className="w-5 h-5" />
                 {cartTotals.itemCount > 0 && !isBillMode && (
                    <span className="absolute top-0 right-0 bg-emerald-500 text-white rounded-full text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center border border-white">
                      {cartTotals.itemCount}
                    </span>
                  )}
              </div>
              <span className={`text-[10px] tracking-tight ${isBillMode ? 'font-bold' : 'font-medium'}`}>Cart</span>
            </button>
        </nav>
      </main>

      {/* Online Orders Sidebar Drawer (Same logic, lighter UI) */}
      {showOnlineDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end no-print">
          <div className="w-full max-w-md bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#059669]" /> Store Orders
              </h3>
              <button onClick={() => { setShowOnlineDrawer(false); searchInputRef.current?.focus(); }} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg font-bold">
                Close
              </button>
            </div>
            
            <div className="flex px-5 bg-white border-b border-gray-100">
              <button 
                onClick={() => setActiveOrderTab('online')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeOrderTab === 'online' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Online Orders
              </button>
              <button 
                onClick={() => setActiveOrderTab('recent')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeOrderTab === 'recent' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Recent POS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {activeOrderTab === 'online' ? (
                onlineOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 font-medium">No incoming online orders right now.</p>
                ) : (
                  onlineOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-200 p-4 rounded-[16px] shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{order.customer.name}</h4>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString()} • {order.customer.mobile}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded border ${order.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-[12px] space-y-1.5 divide-y divide-gray-100 border border-gray-100">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                            <span className="text-gray-700 font-medium">{item.product.name}</span>
                            <span className="font-bold text-gray-900">{Number(item.quantity)} x ₹{Number(item.price).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-1">
                        <span>Payable Total:</span>
                        <span className="text-[#059669]">₹{Number(order.totalAmount).toFixed(0)}</span>
                      </div>
                      {order.status === 'PENDING' && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleUpdateOnlineStatus(order.id, 'APPROVED')} className="flex-1 bg-[#059669] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1">
                            Approve
                          </button>
                          <button onClick={() => handleUpdateOnlineStatus(order.id, 'CANCELLED')} className="bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl text-xs">Reject</button>
                        </div>
                      )}
                      {order.status === 'APPROVED' && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleUpdateOnlineStatus(order.id, 'PICKED_UP')} className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-xs">Mark Picked Up</button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                recentOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 font-medium">No recent POS orders.</p>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-200 p-4 rounded-[16px] shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</h4>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-1 rounded">
                          {order.paymentMode}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-[12px] space-y-1.5 divide-y divide-gray-100 border border-gray-100">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                            <span className="text-gray-700 font-medium">{item.product.name}</span>
                            <span className="font-bold text-gray-900">{Number(item.quantity)} x ₹{Number(item.price).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-1">
                        <span>Paid Total:</span>
                        <span className="text-[#059669]">₹{Number(order.totalAmount).toFixed(0)}</span>
                      </div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-white border border-gray-100 p-6 rounded-[24px] max-w-sm w-full space-y-5 shadow-2xl relative">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto text-[#059669] mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Order Successful!</h3>
              <p className="text-xs text-gray-500 mt-1">Bill Number: {lastOrder.billNumber}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-[16px] text-[13px] space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Payment Mode</span><span className="font-bold text-gray-900">{lastOrder.paymentMode}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>₹{Number(lastOrder.subtotal).toFixed(2)}</span>
              </div>
              {Number(lastOrder.discount) > 0 && (
                <div className="flex justify-between text-[#059669] font-medium">
                  <span>Discount</span><span>-₹{Number(lastOrder.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-black text-gray-900 border-t border-gray-200 pt-3">
                <span>Total Paid</span><span className="text-[#059669]">₹{Number(lastOrder.totalAmount).toFixed(0)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={triggerPrintReceipt} className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-gray-200">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button onClick={triggerWhatsAppBill} disabled={whatsappSent || (!lastOrder.customer && !lastOrder.guestMobile)} className="bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> {whatsappSent ? 'Sent!' : 'WhatsApp'}
              </button>
            </div>
            <button onClick={() => { setShowReceipt(false); searchInputRef.current?.focus(); }} className="w-full bg-[#059669] text-white font-bold py-4 rounded-xl text-sm mt-2">
              Next Sale
            </button>
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
      {/* Customer Info Modal before Bill Mode */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md m-4 flex flex-col relative overflow-hidden">
            {/* Image Header */}
            <div className="w-full h-32 relative">
              <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                 <h1 className="text-white font-black text-3xl tracking-tight">KiranaOS</h1>
                 <p className="text-white/80 text-sm font-medium mt-1">Supermarket</p>
              </div>
              
              <button 
                onClick={() => {
                  setIsGuest(true);
                  setCustomerMobile('');
                  setCustomerName('');
                  setCustomer(null);
                  setShowCustomerModal(false);
                  setIsBillMode(true);
                }}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 pt-6 flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-1.5">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Info</h2>
                <p className="text-gray-500 text-[13px] px-4">Enter details for digital bill & rewards, or continue as guest.</p>
              </div>
              
              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Enter Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={customer !== null && !isNewCustomer}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-4 py-3.5 text-gray-900 font-medium outline-none transition-colors disabled:opacity-70 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={customerMobile}
                    onChange={handleCustomerMobileChange}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-4 py-3.5 text-gray-900 font-medium outline-none transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customerMobile.length >= 10 && customerName.trim().length > 0) {
                        setShowCustomerModal(false);
                        setIsBillMode(true);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setIsBillMode(true);
                  }}
                  disabled={customerMobile.length < 10 || customerName.trim().length === 0}
                  className="w-full bg-[#059669] disabled:bg-gray-300 disabled:text-gray-500 active:bg-green-700 text-white font-bold py-3.5 rounded-xl text-[14px] shadow-sm transition-colors"
                >
                  Save & Continue
                </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-[11px] uppercase tracking-wider font-bold">Or skip</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                onClick={() => {
                  setIsGuest(true);
                  setCustomerMobile('');
                  setCustomerName('');
                  setCustomer(null);
                  setShowCustomerModal(false);
                  setIsBillMode(true);
                }}
                className="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl text-[14px] transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Quick Add Product Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm m-4 flex flex-col p-6 relative">
            <button onClick={() => { setShowQuickAddModal(false); searchInputRef.current?.focus(); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className="bg-orange-50 text-orange-500 w-10 h-10 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Quick Add Item</h2>
                <p className="text-gray-500 text-[12px] font-medium">Barcode not found. Add it now.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">Barcode (Optional)</label>
                <input
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={quickAddBarcode}
                  onChange={(e) => setQuickAddBarcode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-3 py-3 text-sm font-mono text-gray-900 font-bold outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Item Name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Kurkure Solid Masti"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-3 py-3 text-sm text-gray-900 font-bold outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Sell Price (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={quickAddPrice}
                    onChange={(e) => setQuickAddPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-3 py-3 text-sm text-gray-900 font-bold outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Buy Price (₹) <span className="text-gray-400 font-normal">Opt</span></label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={quickAddBuyPrice}
                    onChange={(e) => setQuickAddBuyPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAddProduct();
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#059669] rounded-xl px-3 py-3 text-sm text-gray-900 font-bold outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleQuickAddProduct}
                disabled={isQuickAdding || !quickAddName || !quickAddPrice}
                className="w-full mt-2 bg-[#059669] disabled:bg-gray-300 disabled:text-gray-500 active:bg-green-700 text-white font-bold py-3.5 rounded-xl text-[14px] shadow-sm transition-colors flex justify-center items-center gap-2"
              >
                {isQuickAdding ? <span className="animate-spin border-2 border-white/20 border-t-white w-4 h-4 rounded-full"></span> : <CheckCircle className="w-4 h-4" />}
                Add & Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
