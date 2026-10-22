'use client';

import React, { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { playSuccessSound, playErrorSound } from '@/lib/sounds';
import { io } from 'socket.io-client';
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
  Clock,
  ShoppingCart,
  ArrowRight,
  CheckCircle,
  XCircle,
  X,
  Sparkles,
  ShoppingBag,
  Zap,
  QrCode as QrCodeIcon,
  Check,
  Receipt,
  Keyboard,
  MapPin,
  ChevronDown,
  Bike,
  ShieldCheck,
  Tag,
  Phone,
  Barcode,
  CornerDownLeft
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

const CATEGORY_ITEMS = [
  { id: 'ALL', name: 'All Items', icon: '🛒' },
  { id: 'Dairy, Bread & Eggs', name: 'Dairy & Eggs', icon: '🥛' },
  { id: 'Atta, Rice & Dal', name: 'Atta, Rice & Dal', icon: '🌾' },
  { id: 'Oil, Ghee & Masala', name: 'Oil & Masala', icon: '🧈' },
  { id: 'Snacks & Munchies', name: 'Snacks & Biscuits', icon: '🍿' },
  { id: 'Cold Drinks & Juices', name: 'Drinks & Juices', icon: '🥤' },
  { id: 'Instant & Frozen Food', name: 'Instant Food', icon: '🍜' },
  { id: 'Cleaning Essentials', name: 'Cleaning & Bath', icon: '🧼' },
  { id: 'Personal Care', name: 'Personal Care', icon: '🧴' },
  { id: 'Paan Corner', name: 'Paan Corner', icon: '🍃' },
];

const POPULAR_SEARCH_CHIPS = [
  { label: '🥛 Doodh / Milk', query: 'milk' },
  { label: '🌾 Atta / Flour', query: 'atta' },
  { label: '🧈 Tel / Oil', query: 'oil' },
  { label: '☕ Chai / Tea', query: 'tea' },
  { label: '🍪 Biskut', query: 'biscuit' },
  { label: '🍜 Maggi', query: 'maggi' },
  { label: '🍿 Namkeen', query: 'namkeen' },
  { label: '🧼 Sabun', query: 'soap' },
  { label: '🍞 Bread', query: 'bread' },
  { label: '🧂 Namak', query: 'salt' },
  { label: '🍚 Chawal', query: 'rice' },
  { label: '🥣 Daal', query: 'dal' },
];

const HINGLISH_MAP: Record<string, string[]> = {
  doodh: ['milk', 'amul', 'dairy', 'chaas', 'cow'],
  dudh: ['milk', 'amul', 'dairy'],
  milk: ['doodh', 'milk', 'dairy', 'amul'],
  aata: ['atta', 'flour', 'aashirvaad', 'wheat', 'chakki'],
  atta: ['atta', 'aata', 'flour', 'aashirvaad', 'wheat', 'chakki'],
  flour: ['atta', 'aata', 'maida', 'besan'],
  maida: ['flour', 'maida'],
  besan: ['gram flour', 'besan'],
  tel: ['oil', 'fortune', 'mustard', 'refined', 'safola', 'dhara', 'sunflower', 'sarson'],
  tail: ['oil', 'fortune', 'mustard', 'refined'],
  sarson: ['mustard', 'oil', 'tel', 'sarso'],
  oil: ['oil', 'tel', 'fortune', 'mustard', 'refined'],
  cheeni: ['sugar', 'madhur', 'shakar', 'chini'],
  chini: ['sugar', 'madhur', 'shakar', 'cheeni'],
  shakar: ['sugar', 'jaggery', 'gud'],
  gud: ['jaggery', 'gud', 'sugar'],
  sugar: ['sugar', 'cheeni', 'chini', 'madhur'],
  namak: ['salt', 'tata salt', 'sendha'],
  salt: ['salt', 'namak', 'tata'],
  chai: ['tea', 'chai', 'red label', 'tata tea', 'wagh bakri', 'taj mahal'],
  chay: ['tea', 'chai', 'red label', 'tata tea'],
  tea: ['tea', 'chai', 'chay', 'red label', 'tata tea'],
  coffee: ['coffee', 'nescafe', 'bru'],
  biskut: ['biscuit', 'parle', 'good day', 'marie', 'oreo', 'monaco', 'bounce', 'bourbon', 'cookies', 'krackjack'],
  biscuit: ['biscuit', 'parle', 'good day', 'marie', 'oreo'],
  biscut: ['biscuit', 'parle', 'good day'],
  cookie: ['biscuit', 'cookies'],
  daal: ['dal', 'toor', 'moong', 'chana', 'urad', 'masoor', 'pulses', 'arhar'],
  dal: ['dal', 'daal', 'toor', 'moong', 'chana', 'urad', 'masoor'],
  chawal: ['rice', 'basmati', 'kolam', 'daawat', 'india gate', 'sona masoori'],
  rice: ['rice', 'chawal', 'basmati', 'kolam'],
  sabun: ['soap', 'dettol', 'lifebuoy', 'dove', 'lux', 'pears', 'cinthol', 'godrej'],
  soap: ['soap', 'sabun', 'dettol', 'lux', 'dove'],
  surf: ['detergent', 'surf excel', 'tide', 'ariel', 'rin', 'wheel', 'ghadi', 'powder'],
  detergent: ['detergent', 'surf', 'tide', 'ariel', 'rin'],
  dahi: ['curd', 'yogurt', 'dahi'],
  curd: ['curd', 'dahi'],
  makkhan: ['butter', 'amul butter', 'butter'],
  butter: ['butter', 'makkhan', 'amul'],
  paneer: ['paneer', 'cottage cheese'],
  ghee: ['ghee', 'amul ghee', 'ananda', 'patanjali', 'gowardhan'],
  masala: ['masala', 'spices', 'mdh', 'everest', 'catch', 'haldi', 'mirch', 'dhaniya', 'garam masala'],
  haldi: ['turmeric', 'haldi'],
  mirch: ['chilli', 'mirch', 'red chilli'],
  namkeen: ['bhujia', 'namkeen', 'haldiram', 'bikaji', 'mixture', 'sev'],
  bhujia: ['bhujia', 'namkeen', 'haldiram', 'bikaji'],
  chips: ['chips', 'lays', 'kurkure', 'bingo', 'wafer', 'potato'],
  kurkure: ['kurkure', 'chips', 'snacks', 'namkeen'],
  paani: ['water', 'bisleri', 'kinley', 'aquafina'],
  pani: ['water', 'bisleri', 'kinley', 'aquafina'],
  water: ['water', 'bisleri', 'kinley', 'aquafina'],
  colddrink: ['drink', 'coke', 'pepsi', 'sprite', 'thums up', 'frooti', 'maaza', 'limca', 'fanta', 'beverage', 'cola'],
  drink: ['coke', 'pepsi', 'sprite', 'frooti', 'drink'],
  shampoo: ['shampoo', 'clinic plus', 'head & shoulders', 'sunsilk', 'dove', 'pantene'],
  toothpaste: ['colgate', 'close up', 'pepsodent', 'sensodyne', 'dant kanti', 'paste'],
  paste: ['toothpaste', 'colgate', 'close up'],
  maggi: ['maggi', 'noodles', 'yippee'],
  noodles: ['maggi', 'noodles', 'yippee'],
  bread: ['bread', 'pav', 'brown bread', 'white bread'],
  pav: ['pav', 'bread'],
  anda: ['egg', 'eggs'],
  ande: ['egg', 'eggs'],
  egg: ['egg', 'eggs', 'anda'],
};

function formatProductName(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

// Ultra-fast memoized Product Card for Blinkit Grid
const ProductGridCard = React.memo(
  function ProductGridCard({
    product: p,
    cartQty,
    onTap,
    onUpdateQty,
  }: {
    product: Product;
    cartQty: number;
    onTap: (p: Product) => void;
    onUpdateQty: (key: string, qty: number) => void;
  }) {
    const price = Number(p.sellingPrice);
    const mrp = Math.max(Number(p.purchasePrice || 0), Math.ceil((price * 1.2) / 5) * 5);
    const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const isLowStock = Number(p.stock) <= 5;

    return (
      <div
        onClick={() => onTap(p)}
        className="bg-white rounded-2xl border border-slate-200/80 hover:border-[#0C831F] hover:shadow-lg p-3.5 flex flex-col justify-between shadow-2xs transition-all duration-150 group relative cursor-pointer select-none active:scale-[0.98] transform-gpu"
      >
        {/* Top: Stock Status & Discount Pill */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isLowStock
                ? 'bg-amber-50 text-amber-800 border border-amber-200/80 font-black'
                : 'bg-slate-100 text-slate-600 font-semibold'
            }`}
          >
            {isLowStock ? `Low (${p.stock})` : `Stock: ${p.stock}`}
          </span>

          {discountPercent > 0 && (
            <span className="text-[10px] font-black bg-[#0C831F] text-white px-2 py-0.5 rounded-full shadow-2xs tracking-wide">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Product Image Stage */}
        <div className="w-full h-36 my-1.5 flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-2xl overflow-hidden p-3 border border-slate-100/80 group-hover:border-slate-200 transition-colors relative">
          {p.image ? (
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-[0_4px_10px_rgba(0,0,0,0.06)] group-hover:drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)] group-hover:scale-108 transition-all duration-300 ease-out"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-[#0C831F] font-black text-xl flex items-center justify-center font-mono border border-[#0C831F]/20 shadow-xs">
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Product Name & Pack Pill */}
        <div className="flex-1 flex flex-col justify-end mt-1">
          {p.brand && (
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 truncate">
              {p.brand}
            </span>
          )}
          <h4 className="text-[13px] sm:text-sm font-bold text-slate-900 leading-[1.3] line-clamp-2 min-h-[34px] group-hover:text-[#0C831F] transition-colors tracking-tight">
            {formatProductName(p.name)}
          </h4>
          <div className="mt-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/50">
              {p.unit || '1 unit'}
            </span>
          </div>
        </div>

        {/* Bottom Price Row & Iconic Blinkit ADD Button */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          {/* Price & MRP */}
          <div className="flex flex-col">
            <span className="text-base font-mono font-black text-slate-900 leading-none">
              ₹{price.toFixed(0)}
            </span>
            {mrp > price && (
              <span className="text-[11px] font-mono text-slate-400 line-through mt-0.5 leading-none">
                ₹{mrp.toFixed(0)}
              </span>
            )}
          </div>

          {/* BLINKIT FAMOUS ADD BUTTON / STEPPER */}
          <div onClick={(e) => e.stopPropagation()}>
            {cartQty > 0 ? (
              <div className="flex items-center bg-[#0C831F] text-white rounded-xl h-8 px-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateQty(p.barcode || p.id, cartQty - 1);
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-[#0a6d1a] rounded-lg text-white font-bold cursor-pointer transition-colors active:scale-90"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-xs px-2.5 text-white">
                  {cartQty}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateQty(p.barcode || p.id, cartQty + 1);
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-[#0a6d1a] rounded-lg text-white font-bold cursor-pointer transition-colors active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTap(p);
                }}
                className="px-4 py-1.5 bg-white border-2 border-[#0C831F] hover:bg-[#0C831F] hover:text-white text-[#0C831F] rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                ADD
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.cartQty === next.cartQty &&
      prev.product.id === next.product.id &&
      prev.product.sellingPrice === next.product.sellingPrice &&
      prev.product.stock === next.product.stock &&
      prev.product.name === next.product.name &&
      prev.product.image === next.product.image
    );
  }
);

export default function PosPage() {
  const { user, store, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // Cart State
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load cart from localStorage
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

  // Save cart to localStorage (debounced)
  useEffect(() => {
    if (!isCartLoaded) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('kos_cart', JSON.stringify(cart));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [cart, isCartLoaded]);

  // Input states & filters
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState(48);
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Blinkit Cart Drawer Toggle (visible on desktop side-by-side or sliding drawer)
  const [showCartDrawer, setShowCartDrawer] = useState(true);

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

  // Refs for Autofocus & click outside
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerMobileRef = useRef<HTMLInputElement>(null);

  // Search Dropdown state
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load products list (with instant hydration from sessionStorage)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('kos_products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProductsList(parsed);
        }
      }
    } catch (e) {}

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

  // Autofocus on barcode input
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
      const mrp = Math.max(Number(product.purchasePrice || 0), Math.ceil((price * 1.2) / 5) * 5);

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
      QRCode.toDataURL(upiUrl, { width: 200, margin: 1, color: { dark: '#0C831F', light: '#ffffff' } })
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
      setShowCartDrawer(true);
      showToast(`🛒 ${quantity}x ${product.name} added!`, 'success');
    };

    window.addEventListener('kirana_add_to_cart', handleVoiceAddToCart as any);
    return () => window.removeEventListener('kirana_add_to_cart', handleVoiceAddToCart as any);
  }, []);

  // Keyboard shortcuts listener
  const handleCheckoutRef = useRef<() => void>(() => {});
  useEffect(() => {
    handleCheckoutRef.current = handleCheckout;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
        setShowSearchDropdown(true);
        showToast('Search & Scanner Focused [F2]', 'success');
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
        setShowSearchDropdown(true);
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
        handleCheckoutRef.current();
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
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async (query = '') => {
    try {
      const response = await api.get(`/products?search=${query}`);
      const list = response.data.data || [];
      setProductsList(list);
      if (!query && list.length > 0) {
        try {
          sessionStorage.setItem('kos_products_cache', JSON.stringify(list));
        } catch (e) {}
      }
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

  const handleGridProductTap = useCallback((product: Product) => {
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
  }, []);

  const updateQuantity = useCallback((key: string, newQty: number) => {
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
  }, []);

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
      try {
        const res = await api.get(`/customers/mobile/${val}`);
        if (res.data?.data) {
          setCustomer(res.data.data);
          setCustomerName(res.data.data.name);
          setIsNewCustomer(false);
          setIsGuest(false);
          showToast(`Customer: ${res.data.data.name} selected!`, 'success');
        } else {
          setCustomer(null);
          setIsNewCustomer(true);
          setIsGuest(false);
        }
      } catch (err) {
        setCustomer(null);
        setIsNewCustomer(true);
        setIsGuest(false);
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
      showToast('Cart is empty! Add items first.', 'error');
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
      showToast('⚡ Order Placed Successfully!', 'success');
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

  // Smart Hinglish & Fuzzy Filter for products (non-blocking with deferred query)
  const filteredProducts = useMemo(() => {
    const rawQuery = deferredSearchQuery.trim().toLowerCase();

    const categoryFilter = (p: Product) => {
      if (selectedCategory === 'ALL') return true;
      const catName = (p.category?.name || '').toLowerCase();
      const sel = selectedCategory.toLowerCase();
      return catName.includes(sel) || sel.includes(catName);
    };

    if (!rawQuery) {
      return productsList.filter(categoryFilter);
    }

    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    // Expand search terms with Hinglish synonyms
    const expandedTokens = new Set<string>();
    queryTokens.forEach((token) => {
      expandedTokens.add(token);
      if (HINGLISH_MAP[token]) {
        HINGLISH_MAP[token].forEach((syn) => expandedTokens.add(syn.toLowerCase()));
      }
    });

    const scored = productsList
      .filter(categoryFilter)
      .map((p) => {
        const name = p.name.toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const category = (p.category?.name || '').toLowerCase();

        let score = 0;

        // Exact barcode match gets highest priority
        if (barcode === rawQuery) {
          score += 1000;
        } else if (barcode.includes(rawQuery)) {
          score += 500;
        }

        // Exact name match
        if (name === rawQuery) {
          score += 600;
        } else if (name.startsWith(rawQuery)) {
          score += 300;
        } else if (name.includes(rawQuery)) {
          score += 200;
        }

        // Direct token matches
        for (const token of queryTokens) {
          if (name.includes(token)) score += 80;
          if (brand.includes(token)) score += 60;
          if (category.includes(token)) score += 40;
        }

        // Hinglish / Synonym matches
        for (const syn of expandedTokens) {
          if (!queryTokens.includes(syn)) {
            if (name.includes(syn)) score += 70;
            if (brand.includes(syn)) score += 40;
            if (category.includes(syn)) score += 20;
          }
        }

        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);

    return scored;
  }, [productsList, deferredSearchQuery, selectedCategory]);

  // Reset pagination chunk when query/category changes
  useEffect(() => {
    setVisibleCount(48);
  }, [deferredSearchQuery, selectedCategory]);

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = e.currentTarget.value;
    const cleanQuery = currentValue.trim();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex((prev) =>
        prev < Math.min(filteredProducts.length, 10) - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();

      if (!cleanQuery) {
        setShowSearchDropdown(false);
        setIsSearchFocused(false);
        return;
      }

      // Barcode auto-scanner case (digits 6+)
      const isBarcode = /^\d{6,}$/.test(cleanQuery);
      if (isBarcode) {
        const exactBarcodeProduct = productsList.find((p) => p.barcode === cleanQuery);
        if (exactBarcodeProduct) {
          handleGridProductTap(exactBarcodeProduct);
          setSearchQuery('');
          setShowSearchDropdown(false);
          setSearchSelectedIndex(-1);
          return;
        }

        try {
          const res = await api.get(`/products/barcode/${cleanQuery}`);
          if (res.data?.data) {
            handleGridProductTap(res.data.data);
            setSearchQuery('');
            setShowSearchDropdown(false);
            setSearchSelectedIndex(-1);
            return;
          }
        } catch (err) {}

        playErrorSound();
        setQuickAddBarcode(cleanQuery);
        setShowQuickAddModal(true);
        setSearchQuery('');
        setShowSearchDropdown(false);
        return;
      }

      // If user explicitly navigated with Arrow keys in dropdown
      if (showSearchDropdown && searchSelectedIndex >= 0 && searchSelectedIndex < filteredProducts.length) {
        handleGridProductTap(filteredProducts[searchSelectedIndex]);
        setSearchQuery('');
        setShowSearchDropdown(false);
        setSearchSelectedIndex(-1);
        return;
      }

      // Regular text search: close dropdown, keep grid filtered to view products
      setShowSearchDropdown(false);
      setIsSearchFocused(false);
      setSearchSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
      setIsSearchFocused(false);
      setSearchSelectedIndex(-1);
    }
  };

  const pendingOnlineCount = onlineOrders.filter((o) => o.status === 'PENDING').length;

  if (authLoading || !user) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-[#F8CB46]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-black/20 border-t-[#0C831F] rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-900">Loading Blinkit KiranaOS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-[#1c1c1c] font-sans antialiased overflow-hidden selection:bg-[#0C831F] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Blinkit Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[160] px-4 py-3 rounded-2xl border text-xs font-black shadow-2xl flex items-center gap-2.5 transition-all transform animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success' 
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-950 text-rose-200 border-rose-500/40'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* BLINKIT POS TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 flex-shrink-0 z-30 no-print shadow-xs">
          {/* Store Status Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-[#f4f6f8] px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse" />
              <span className="text-xs font-bold text-gray-900 truncate max-w-[180px]">
                {store?.name || 'Counter 01'}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">POS Terminal</span>
            </div>
          </div>

          {/* Blinkit Big Search Bar & Barcode Scanner Omnibox */}
          <div ref={searchContainerRef} className="flex-1 max-w-2xl relative">
            <div className={`relative flex items-center bg-[#f4f6f8] rounded-xl border transition-all duration-150 ${
              isSearchFocused 
                ? 'bg-white border-[#0C831F] ring-2 ring-[#0C831F]/20 shadow-xs' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              {/* Left Icon: Live Barcode or Search */}
              <div className="pl-3.5 pr-2 flex items-center pointer-events-none shrink-0">
                {/^\d+$/.test(searchQuery.trim()) ? (
                  <Barcode className="w-4 h-4 text-[#0C831F] animate-pulse" />
                ) : (
                  <Search className={`w-4 h-4 transition-colors ${isSearchFocused ? 'text-[#0C831F]' : 'text-gray-400'}`} />
                )}
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setShowSearchDropdown(true);
                }}
                onClick={() => {
                  setIsSearchFocused(true);
                  setShowSearchDropdown(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                  setSearchSelectedIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder='Search "doodh", "atta", "tel", "biskut", "sabun" or scan barcode [F2]'
                className="w-full bg-transparent py-2.5 pr-2 text-xs text-gray-900 placeholder-gray-400 font-semibold outline-none"
              />

              {/* Right Indicators: Clear button & F2 Shortcut pill */}
              <div className="flex items-center gap-1.5 pr-3 shrink-0">
                {searchQuery.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchSelectedIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold bg-white text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded shadow-2xs">
                  F2
                </span>
              </div>
            </div>

            {/* Dropdown Suggestions & Quick Staples */}
            <AnimatePresence>
              {showSearchDropdown && (isSearchFocused || searchQuery.trim() !== '') && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.99 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 divide-y divide-gray-100"
                >
                  {/* State 1: Search is Empty -> Show Popular Kirana Staples */}
                  {searchQuery.trim() === '' ? (
                    <div className="p-3.5 bg-gradient-to-b from-gray-50/70 to-white">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500">
                          <Sparkles className="w-3.5 h-3.5 text-[#0C831F]" />
                          Popular Quick Staples (English & Hinglish)
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Press / to focus</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SEARCH_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              setSearchQuery(chip.query);
                              setShowSearchDropdown(false);
                              setIsSearchFocused(false);
                              setSearchSelectedIndex(-1);
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 hover:text-[#0C831F] text-gray-700 text-xs font-bold rounded-xl border border-gray-200 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <span>{chip.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                        <span>⚡ Point barcode scanner anytime to auto-add item</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSearchDropdown(false);
                            setQuickAddBarcode('');
                            setShowQuickAddModal(true);
                          }}
                          className="font-bold text-[#0C831F] hover:underline"
                        >
                          + New Item [F3]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* State 2: Query has text */}
                      {/* Barcode scanner banner if digits */}
                      {/^\d{6,}$/.test(searchQuery.trim()) && (
                        <div className="px-3.5 py-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold">
                            <Barcode className="w-4 h-4 text-[#0C831F]" />
                            <span>Barcode detected: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">{searchQuery.trim()}</code></span>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            Press <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">Enter ↵</kbd> to add
                          </span>
                        </div>
                      )}

                      {/* Omnibox Result Counter & Keyboard Hints */}
                      <div className="px-3.5 py-1.5 bg-gray-50 flex items-center justify-between text-[10px] text-gray-500 font-semibold border-b border-gray-100">
                        <span>Found {filteredProducts.length} items for "{searchQuery}"</span>
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-gray-400">
                          <span>↑↓ navigate</span> • <span>Enter to add</span> • <span>Esc close</span>
                        </span>
                      </div>

                      {/* Products List */}
                      {filteredProducts.length > 0 ? (
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                          {filteredProducts.slice(0, 10).map((product, index) => {
                            const inCartQty = cart[product.barcode || product.id]?.quantity || 0;
                            const isSelected = searchSelectedIndex === index;
                            const stockNum = Number(product.stock) || 0;

                            return (
                              <div
                                key={product.id}
                                onMouseEnter={() => setSearchSelectedIndex(index)}
                                onClick={() => {
                                  handleGridProductTap(product);
                                  setSearchQuery('');
                                  setShowSearchDropdown(false);
                                  searchInputRef.current?.focus();
                                }}
                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-50/90' : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Left: Product Thumbnail & Meta */}
                                <div className="flex items-center gap-3 min-w-0 pr-3">
                                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-700 shrink-0 overflow-hidden">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                      <span className="text-gray-500 font-mono font-bold">{product.name.slice(0, 2).toUpperCase()}</span>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-xs font-bold text-gray-900 truncate leading-snug">{formatProductName(product.name)}</p>
                                      {product.brand && (
                                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                          {product.brand}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium mt-0.5">
                                      <span>{product.unit || 'unit'}</span>
                                      <span>•</span>
                                      {stockNum <= 0 ? (
                                        <span className="text-rose-600 font-bold">Out of stock</span>
                                      ) : stockNum <= 5 ? (
                                        <span className="text-amber-600 font-bold">Low stock ({stockNum})</span>
                                      ) : (
                                        <span className="text-emerald-700 font-semibold">{stockNum} in stock</span>
                                      )}
                                      {product.barcode && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono text-gray-400">#{product.barcode}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Price & One-click + ADD Button */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <span className="text-sm font-mono font-black text-[#0C831F]">
                                      ₹{Number(product.sellingPrice).toFixed(0)}
                                    </span>
                                    {Number(product.purchasePrice) > Number(product.sellingPrice) && (
                                      <p className="text-[10px] text-gray-400 line-through">
                                        ₹{Number(product.purchasePrice).toFixed(0)}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGridProductTap(product);
                                      searchInputRef.current?.focus();
                                    }}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      inCartQty > 0
                                        ? 'bg-[#0C831F] text-white shadow-xs hover:bg-[#096618]'
                                        : 'bg-emerald-50 hover:bg-[#0C831F] text-[#0C831F] hover:text-white border border-emerald-200 hover:border-[#0C831F]'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{inCartQty > 0 ? `${inCartQty} in Cart` : 'ADD'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-gray-800">No product found for "{searchQuery}"</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Try Hinglish alias like "doodh", "atta", "tel", or add item</p>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddName(searchQuery);
                              setShowSearchDropdown(false);
                              setShowQuickAddModal(true);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0C831F] hover:bg-[#096618] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add "{searchQuery}" to Store [F3]</span>
                          </button>
                        </div>
                      )}

                      {/* Dropdown Footer */}
                      {filteredProducts.length > 0 && (
                        <div className="px-3.5 py-2 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium border-t border-gray-100">
                          <span>Don't see your item?</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddName(searchQuery);
                              setShowSearchDropdown(false);
                              setShowQuickAddModal(true);
                            }}
                            className="text-[#0C831F] hover:underline font-bold text-xs cursor-pointer"
                          >
                            + Quick Add "{searchQuery}" [F3]
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Quick Actions & Blinkit Green Cart Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setQuickAddBarcode('');
                setShowQuickAddModal(true);
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-[#f4f6f8] hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#0C831F]" />
              <span>Add Item [F3]</span>
            </button>

            <button
              onClick={() => {
                fetchOnlineOrders();
                setShowOnlineDrawer(true);
              }}
              className="relative p-2 bg-[#f4f6f8] hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-200 transition-colors cursor-pointer"
              title="Store Orders"
            >
              <ShoppingBag className="w-4 h-4 text-gray-700" />
              {pendingOnlineCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Mobile Cart Trigger / Toggle when Drawer closed */}
            <button
              onClick={() => setShowCartDrawer(!showCartDrawer)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                showCartDrawer
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  : 'bg-[#0C831F] hover:bg-[#0a6d1a] text-white shadow-md'
              }`}
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <div className="flex items-center gap-1.5 leading-tight">
                <span>{showCartDrawer ? 'Hide Cart' : 'View Cart'}</span>
                <span className="font-mono font-bold">({cartTotals.itemCount})</span>
              </div>
            </button>
          </div>
        </header>

        {/* BLINKIT 2-COLUMN MAIN CONTENT (Categories Rail + Product Grid + Slide Cart) */}
        <div className="flex-1 flex overflow-hidden no-print">
          {/* 1. BLINKIT LEFT CATEGORY RAIL */}
          <aside className="w-20 md:w-56 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col py-2 select-none hide-scrollbar">
            {CATEGORY_ITEMS.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-3 px-3 md:px-4 py-3 text-left transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-[#e9f7ec] text-[#0C831F] font-black'
                      : 'text-gray-600 hover:bg-gray-50 font-bold'
                  }`}
                >
                  {/* Left Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0C831F] rounded-r-md" />
                  )}
                  <span className="text-xl flex-shrink-0">{cat.icon}</span>
                  <span className="hidden md:inline text-xs leading-tight truncate">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* 2. CENTER PRODUCT CATALOG FEED */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f4f6f8]">
            {/* Category Title & Product Count (Clean Header without redundant banners) */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span>{CATEGORY_ITEMS.find((c) => c.id === selectedCategory)?.name || 'Products'}</span>
                <span className="text-xs text-gray-400 font-normal">({filteredProducts.length} items)</span>
              </h3>
            </div>

            {/* BLINKIT PRODUCT CARDS GRID */}
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-2">
                  📦
                </div>
                <h4 className="text-sm font-bold text-gray-800">No products in this category</h4>
                <p className="text-xs text-gray-400 mt-1">Tap below to add items to your store.</p>
                <button
                  onClick={() => {
                    setQuickAddBarcode('');
                    setShowQuickAddModal(true);
                  }}
                  className="mt-3 px-4 py-2 bg-[#0C831F] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  + Add Product Now
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 pb-8 lg:pb-6">
                  {filteredProducts.slice(0, visibleCount).map((p) => {
                    const cartQty = cart[p.barcode || p.id]?.quantity || 0;
                    return (
                      <ProductGridCard
                        key={p.id}
                        product={p}
                        cartQty={cartQty}
                        onTap={handleGridProductTap}
                        onUpdateQty={updateQuantity}
                      />
                    );
                  })}
                </div>

                {filteredProducts.length > visibleCount && (
                  <div className="flex justify-center pb-24 lg:pb-8">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 48)}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#0C831F] text-slate-800 text-xs font-bold shadow-xs transition-all cursor-pointer select-none active:scale-95"
                    >
                      Load More Items ({filteredProducts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* 3. BLINKIT SLIDE-IN CART & BILLING REGISTER (Desktop Side Panel) */}
          <AnimatePresence>
            {showCartDrawer && (
              <motion.aside
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-full lg:w-[420px] bg-white border-l border-gray-200 flex flex-col h-full z-40 shadow-xl flex-shrink-0"
              >
                {/* Cart Drawer Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-900">My Cart</h3>
                    <span className="text-[11px] font-bold bg-[#e9f7ec] text-[#0C831F] px-2 py-0.5 rounded-full">
                      {cartTotals.itemCount} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearCart}
                      disabled={cartTotals.itemCount === 0}
                      className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowCartDrawer(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Customer Attachment Box */}
                <div className="mx-4 mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block leading-tight">
                        {customer ? customer.name : isGuest ? 'Walk-in Customer' : customerName || 'Guest'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {customer ? customer.mobile : customerMobile || 'No phone attached'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-xs font-bold text-[#0C831F] hover:underline cursor-pointer"
                  >
                    {customer ? 'Change' : '+ Grahak [F4]'}
                  </button>
                </div>

                {/* Udhaar Warning if Customer has balance */}
                {customer && customer.creditBalance !== undefined && customer.creditBalance > 0 && (
                  <div className="mx-4 mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
                    <span className="font-bold">⚠️ Purana Udhaar: ₹{customer.creditBalance}</span>
                    <button onClick={() => router.push('/credit')} className="text-[10px] font-black underline">
                      Khata →
                    </button>
                  </div>
                )}

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {Object.keys(cart).length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400">
                      <ShoppingCart className="w-10 h-10 mb-2 stroke-1 text-gray-300" />
                      <p className="text-xs font-bold text-gray-600">Your cart is empty</p>
                      <p className="text-[11px] text-gray-400">Add products to build your bill</p>
                    </div>
                  ) : (
                    Object.entries(cart).map(([key, item]) => {
                      const price = Number(item.product.sellingPrice);
                      const itemTotal = price * item.quantity;

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 transition-all shadow-2xs"
                        >
                          {/* Photo / Thumbnail */}
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-center overflow-hidden shrink-0 p-1">
                            {item.product.image ? (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            ) : (
                              <div className="w-full h-full rounded-lg bg-emerald-50 text-[#0C831F] font-bold text-xs flex items-center justify-center font-mono">
                                {item.product.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-gray-900 truncate leading-snug">
                              {item.product.name}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-0.5">
                              <span>₹{price.toFixed(0)}</span>
                              {item.product.unit && (
                                <>
                                  <span>•</span>
                                  <span>{item.product.unit}</span>
                                </>
                              )}
                              {item.quantity > 1 && (
                                <span className="text-[10px] font-mono text-gray-400">
                                  (×{item.quantity})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stepper & Total Price */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center bg-[#0C831F] text-white rounded-lg h-7 px-1 shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(key, item.quantity - 1)}
                                className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-black text-xs px-2 text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(key, item.quantity + 1)}
                                className="w-5 h-5 flex items-center justify-center hover:bg-[#0a6d1a] rounded text-white font-bold cursor-pointer transition-colors active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="min-w-[56px] text-right">
                              <span className="font-mono font-black text-sm text-gray-900 block leading-tight">
                                ₹{itemTotal.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Blinkit Bill Details Breakdown */}
                {Object.keys(cart).length > 0 && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 shrink-0">
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-mono">₹{cartTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (Included)</span>
                        <span className="font-mono">₹{cartTotals.totalTax.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-[#0C831F] font-bold">
                          <span>Discount Applied [F8]</span>
                          <span className="font-mono">-₹{discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-200 text-sm font-black text-gray-900">
                        <span>Grand Total</span>
                        <span className="font-mono text-xl text-[#0C831F]">
                          ₹{cartTotals.finalTotal.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Mode Buttons */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-gray-200">
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
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            paymentMode === m.id
                              ? m.id === 'CREDIT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[#0C831F] text-white shadow-xs'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* UPI QR Display */}
                    {paymentMode === 'UPI' && (
                      <div className="p-3 bg-white rounded-xl border border-green-200 flex items-center gap-3 shadow-2xs">
                        <div className="bg-white p-1 rounded-lg shrink-0 border border-gray-100">
                          {upiQrDataUrl ? (
                            <img src={upiQrDataUrl} alt="UPI QR" className="w-16 h-16 object-contain" />
                          ) : (
                            <QrCodeIcon className="w-16 h-16 text-gray-800" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-[#0C831F] block">
                            Scan to Pay with Any UPI App
                          </span>
                          <span className="text-xs font-mono font-black text-gray-900">
                            ₹{cartTotals.finalTotal.toFixed(0)}
                          </span>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">
                            {store?.upiId || 'kiranaos@okhdfcbank'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cash Denominations */}
                    {paymentMode === 'CASH' && (
                      <div className="p-2.5 bg-white rounded-xl border border-gray-200 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
                          <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Tender:</span>
                          {[100, 200, 500].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                cashTendered === amt
                                  ? 'bg-[#0C831F] text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                ? 'bg-[#0C831F] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Exact
                          </button>
                        </div>

                        {cashTendered !== null && cashTendered > cartTotals.finalTotal && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-xs font-bold text-green-900">
                            <span>Return Change:</span>
                            <span className="font-mono font-black text-[#0C831F]">
                              ₹{(cashTendered - cartTotals.finalTotal).toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* BIG BLINKIT GREEN CHECKOUT BUTTON */}
                    <button
                      onClick={handleCheckout}
                      disabled={checkingOut || cartTotals.itemCount === 0}
                      className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] active:bg-[#085a15] disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-between px-5 shadow-md shadow-green-900/20 cursor-pointer"
                    >
                      <span className="font-mono">₹{cartTotals.finalTotal.toFixed(0)}</span>
                      <span className="flex items-center gap-1 tracking-wide">
                        {checkingOut ? 'Placing Order...' : 'Place Order [F12]'}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0C831F]" /> Customer Details
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Mobile Number (10 Digits)
                </label>
                <input
                  ref={customerMobileRef}
                  type="tel"
                  maxLength={10}
                  value={customerMobile}
                  onChange={handleCustomerMobileChange}
                  placeholder="9876543210"
                  className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono font-bold outline-none focus:border-[#0C831F]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  disabled={customer !== null}
                  className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-bold outline-none focus:border-[#0C831F] disabled:opacity-60"
                />
              </div>

              {isNewCustomer && (
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] text-white font-bold py-2.5 rounded-xl text-xs"
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
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Continue as Walk-in (Guest)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0C831F]" /> Add New Item [F3]
              </h3>
              <button onClick={() => setShowQuickAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Barcode (Optional)</label>
                <input
                  type="text"
                  value={quickAddBarcode}
                  onChange={(e) => setQuickAddBarcode(e.target.value)}
                  placeholder="Scan or enter barcode"
                  className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono font-bold outline-none focus:border-[#0C831F]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="e.g. Amul Butter 500g"
                  className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-bold outline-none focus:border-[#0C831F]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={quickAddPrice}
                    onChange={(e) => setQuickAddPrice(e.target.value)}
                    placeholder="275"
                    className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono font-bold outline-none focus:border-[#0C831F]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Buy Price (₹)</label>
                  <input
                    type="number"
                    value={quickAddBuyPrice}
                    onChange={(e) => setQuickAddBuyPrice(e.target.value)}
                    placeholder="250"
                    className="w-full bg-[#f4f6f8] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono font-bold outline-none focus:border-[#0C831F]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickAddProduct}
                disabled={isQuickAdding || !quickAddName || !quickAddPrice}
                className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] text-white font-black py-3 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isQuickAdding ? 'Adding...' : 'Save & Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONLINE ORDERS DRAWER */}
      {showOnlineDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end no-print">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#0C831F]" /> Online Orders & History
              </h3>
              <button onClick={() => setShowOnlineDrawer(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveOrderTab('online')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 ${
                  activeOrderTab === 'online' ? 'border-[#0C831F] text-[#0C831F]' : 'border-transparent text-gray-400'
                }`}
              >
                Online Orders ({onlineOrders.length})
              </button>
              <button
                onClick={() => setActiveOrderTab('recent')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 ${
                  activeOrderTab === 'recent' ? 'border-[#0C831F] text-[#0C831F]' : 'border-transparent text-gray-400'
                }`}
              >
                Recent POS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f4f6f8]">
              {activeOrderTab === 'online' ? (
                onlineOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-12">No online orders found.</p>
                ) : (
                  onlineOrders.map((o) => (
                    <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{o.customer?.name || 'Online Customer'}</p>
                          <span className="text-[10px] text-gray-400 font-mono">{o.customer?.mobile}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-[#0C831F] border border-green-200">
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-black text-[#0C831F]">
                        ₹{Number(o.totalAmount).toFixed(0)}
                      </div>
                      {o.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateOnlineStatus(o.id, 'APPROVED')}
                            className="flex-1 bg-[#0C831F] text-white font-bold py-1.5 rounded-lg text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateOnlineStatus(o.id, 'CANCELLED')}
                            className="bg-gray-100 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-xs"
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
                  <p className="text-xs text-gray-400 text-center py-12">No recent POS orders.</p>
                ) : (
                  recentOrders.map((r) => (
                    <div key={r.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">#{r.billNumber || r.id.slice(0, 6)}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-mono font-black text-[#0C831F]">
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

      {/* CHECKOUT RECEIPT MODAL */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-white border border-gray-100 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-[#e9f7ec] text-[#0C831F] flex items-center justify-center mx-auto border border-green-200">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-gray-900">Order Placed Successfully!</h3>
              <p className="text-xs font-mono text-gray-400 mt-1">Bill #{lastOrder.billNumber || lastOrder.id.slice(0, 8)}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Total Amount:</span>
                <span className="text-gray-900 font-bold">₹{Number(lastOrder.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Mode:</span>
                <span className="text-[#0C831F] font-bold">{lastOrder.paymentMode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerPrintReceipt}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Bill
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
              className="w-full bg-[#0C831F] hover:bg-[#0a6d1a] text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Next Order (New Bill)
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
    </div>
  );
}
