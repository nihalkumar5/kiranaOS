'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { playChimeSound, playErrorSound, speakHindi } from '@/lib/sounds';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  Package,
  Volume2,
  VolumeX,
  AlertCircle,
  RotateCcw,
  Send,
  MessageSquare,
  BadgeDollarSign,
  ShoppingCart,
  Boxes,
  HelpCircle,
  Trash2,
  Minimize2,
  Maximize2,
  BookOpen,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  BarChart2,
} from 'lucide-react';

interface ProposedUpdates {
  sellingPrice?: { old: number; new: number };
  purchasePrice?: { old: number; new: number };
  stock?: { old: number; new: number };
}

interface ProductDetails {
  id: string;
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  unit: string;
  category: string;
}

interface NewProductData {
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  unit: string;
  categoryId?: string | null;
  categoryName?: string;
}

interface CreditEntryData {
  customerId?: string | null;
  customerName: string;
  customerMobile?: string;
  type: 'GIVE_CREDIT' | 'PAYMENT_RECEIVED';
  amount: number;
  description?: string;
}

interface CreditReminderData {
  customerName: string;
  mobile: string;
  balance: number;
  whatsappUrl: string;
  reminderMsg: string;
}

interface CreditSummaryData {
  totalDue: number;
  dueList: Array<{
    id: string;
    name: string;
    mobile: string;
    balance: number;
    whatsappUrl: string;
  }>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isVoice?: boolean;
  type?: 'TEXT' | 'CONFIRM_UPDATE' | 'PRODUCT_INFO' | 'SALES_INFO' | 'LOW_STOCK' | 'SUCCESS' | 'CREATE_NEW_PRODUCT' | 'CONFIRM_CREDIT_ENTRY' | 'CREDIT_REMINDER' | 'CREDIT_SUMMARY' | 'CREDIT_REMINDER_LIST';
  product?: ProductDetails;
  proposedUpdates?: ProposedUpdates;
  newProduct?: NewProductData;
  creditEntry?: CreditEntryData;
  creditReminder?: CreditReminderData;
  creditSummary?: CreditSummaryData;
  dueList?: Array<{
    id: string;
    name: string;
    mobile: string;
    balance: number;
    whatsappUrl: string;
  }>;
  confirmed?: boolean;
  appliedDetails?: string;
  alternatives?: Array<{
    id: string;
    name: string;
    sellingPrice: number;
    purchasePrice: number;
    stock: number;
    unit: string;
    category: string;
  }>;
}

function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-inherit">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return (
          <p key={idx} className="leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-inherit">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return (
                  <span key={pIdx} className="italic text-inherit opacity-85">
                    {part.slice(1, -1)}
                  </span>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function VoicePriceUpdater() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('en-IN');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable values for pending confirmation cards: messageId -> { name, sellingPrice, purchasePrice, stock, unit, mobile, amount, description }
  const [editableCardValues, setEditableCardValues] = useState<
    Record<string, { name?: string; sellingPrice?: string; purchasePrice?: string; stock?: string; unit?: string; mobile?: string; amount?: string; description?: string }>
  >({});
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your Kirana AI copilot. Ask me to change prices, add new items, or manage customer credit by voice or text.',
      timestamp: 'Just now',
      type: 'TEXT',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening, transcript]);

  // Global hotkey 'V' or 'C' and custom event to toggle AI Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'v' || e.key === 'V' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleToggleVoice = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kirana_toggle_voice', handleToggleVoice);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kirana_toggle_voice', handleToggleVoice);
    };
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('माइक्रोफोन अनुमति बंद है। कृपया ब्राउज़र सेटिंग्स में माइक ऑन करें या नीचे टाइप करें।');
        } else if (event.error === 'no-speech') {
          setErrorMsg('आवाज़ सुनाई नहीं दी। कृपया थोड़ा साफ़ और पास से बोलें।');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  // Auto-send when speech ends and transcript exists
  useEffect(() => {
    if (!isListening && transcript.trim().length > 1 && !isLoading) {
      const textToSend = transcript.trim();
      setTranscript('');
      handleSendMessage(textToSend, true);
    }
  }, [isListening, transcript, isLoading]);

  const startListening = () => {
    setErrorMsg(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start caught', e);
      }
    } else {
      setErrorMsg('इस ब्राउज़र में वॉइस सपोर्ट उपलब्ध नहीं है। कृपया नीचे लिखकर संदेश भेजें।');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  // Send message to `/api/ai/chat`
  const handleSendMessage = async (text: string, isVoice = false) => {
    if (!text.trim()) return;

    const userMsgId = 'usr_' + Date.now();
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: timeStr,
      isVoice,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/ai/chat', { message: text });
      const data = res.data;

      const aiMsgId = 'ai_' + Date.now();
      const newAiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: data.type,
        product: data.product,
        proposedUpdates: data.proposedUpdates,
        newProduct: data.newProduct,
        alternatives: data.alternatives,
        creditEntry: data.creditEntry,
        creditReminder: data.creditReminder,
        creditSummary: data.creditSummary,
        dueList: data.dueList,
      };

      // Pre-fill editable input values for update confirmation cards
      if (data.type === 'CONFIRM_UPDATE' && data.proposedUpdates) {
        setEditableCardValues((prev) => ({
          ...prev,
          [aiMsgId]: {
            sellingPrice: data.proposedUpdates.sellingPrice?.new?.toString() || '',
            purchasePrice: data.proposedUpdates.purchasePrice?.new?.toString() || '',
            stock: data.proposedUpdates.stock?.new?.toString() || '',
          },
        }));
      } else if (data.type === 'CREATE_NEW_PRODUCT' && data.newProduct) {
        setEditableCardValues((prev) => ({
          ...prev,
          [aiMsgId]: {
            name: data.newProduct.name || '',
            sellingPrice: data.newProduct.sellingPrice?.toString() || '0',
            purchasePrice: data.newProduct.purchasePrice?.toString() || '0',
            stock: data.newProduct.stock?.toString() || '0',
            unit: data.newProduct.unit || 'pcs',
          },
        }));
      } else if (data.type === 'CONFIRM_CREDIT_ENTRY' && data.creditEntry) {
        setEditableCardValues((prev) => ({
          ...prev,
          [aiMsgId]: {
            name: data.creditEntry.customerName || '',
            mobile: data.creditEntry.customerMobile || '',
            amount: data.creditEntry.amount?.toString() || '',
            description: data.creditEntry.description || '',
          },
        }));
      }

      // Automatically add product to POS cart if intent was ADD_TO_CART
      if (data.type === 'ADD_TO_CART' && data.product) {
        window.dispatchEvent(
          new CustomEvent('kirana_add_to_cart', {
            detail: { product: data.product, quantity: data.quantity || 1 },
          })
        );
      }

      setMessages((prev) => [...prev, newAiMsg]);

      // Voice response
      if (voiceOutputEnabled && data.speechText) {
        speakHindi(data.speechText);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'सर्वर से कनेक्ट नहीं हो सका।');
      playErrorSound();
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and save Credit Entry
  const handleConfirmCreditEntry = async (msg: ChatMessage) => {
    if (!msg.creditEntry) return;
    const msgId = msg.id;
    const cardVals = editableCardValues[msgId] || {};

    const customerName = cardVals.name || msg.creditEntry.customerName;
    const customerMobile = cardVals.mobile || msg.creditEntry.customerMobile || '';
    const amount = parseFloat(cardVals.amount || String(msg.creditEntry.amount));
    const type = msg.creditEntry.type;
    const description = cardVals.description || msg.creditEntry.description || (type === 'GIVE_CREDIT' ? 'Udhaar Saaman' : 'Nagar Payment');

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Sahi raashi dalein.');
      return;
    }

    setConfirmingMessageId(msgId);
    setErrorMsg(null);

    try {
      const res = await api.post('/credit', {
        customerId: msg.creditEntry.customerId,
        customerName,
        customerMobile: customerMobile || undefined,
        type,
        amount,
        description,
      });

      if (res.data.success) {
        playChimeSound();
        const actionWord = type === 'GIVE_CREDIT' ? 'udhar' : 'jama';
        const speech = `${customerName} ke khate me ${amount} rupaye ${actionWord} darj ho gaye. Kul baaki ${res.data.data.newBalance} rupaye hai.`;
        if (voiceOutputEnabled) {
          speakHindi(speech);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kiranaos:credit-updated', { detail: res.data.data }));
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  confirmed: true,
                  appliedDetails: `${customerName} का ₹${amount} ${type === 'GIVE_CREDIT' ? 'उधार (-)' : 'जमा (+)'} दर्ज हो गया! कुल बाकी: ₹${res.data.data.newBalance}`,
                  creditReminder: res.data.data.whatsappUrl
                    ? {
                        customerName,
                        mobile: res.data.data.customer?.mobile,
                        balance: res.data.data.newBalance,
                        whatsappUrl: res.data.data.whatsappUrl,
                        reminderMsg: res.data.data.reminderMsg,
                      }
                    : undefined,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Hisaab save karne me samasya aayi.');
      playErrorSound();
    } finally {
      setConfirmingMessageId(null);
    }
  };

  // Create new product directly from chat card
  const handleCreateNewProduct = async (msg: ChatMessage) => {
    if (!msg.newProduct) return;
    const msgId = msg.id;
    const cardVals = editableCardValues[msgId] || {};

    const name = cardVals.name || msg.newProduct.name;
    const sellingPrice = parseFloat(cardVals.sellingPrice || String(msg.newProduct.sellingPrice));
    const purchasePrice = parseFloat(cardVals.purchasePrice || String(msg.newProduct.purchasePrice));
    const stock = parseFloat(cardVals.stock || String(msg.newProduct.stock));
    const unit = cardVals.unit || msg.newProduct.unit || 'pcs';

    if (!name || isNaN(sellingPrice)) {
      setErrorMsg('Product नाम और बिक्री रेट आवश्यक हैं।');
      return;
    }

    setConfirmingMessageId(msgId);
    setErrorMsg(null);

    try {
      const res = await api.post('/products', {
        name,
        sellingPrice,
        purchasePrice,
        stock,
        unit,
        categoryId: msg.newProduct.categoryId,
      });

      if (res.data.success) {
        playChimeSound();
        if (voiceOutputEnabled) {
          speakHindi(`${res.data.data.name} naya saman dukaan me jud gaya`);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kiranaos:product-updated', {
              detail: res.data.data,
            }),
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  confirmed: true,
                  appliedDetails: `नया सामान '${res.data.data.name}' दुकान में जुड़ गया! (बिक्री: ₹${sellingPrice}, खरीद: ₹${purchasePrice}, स्टॉक: ${stock} ${unit})`,
                }
              : m,
          ),
        );
      } else {
        setErrorMsg(res.data.message || 'Product add nahi ho paya.');
        playErrorSound();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Naya saman jodne me samasya aayi.');
      playErrorSound();
    } finally {
      setConfirmingMessageId(null);
    }
  };

  // Confirm changes from an AI card
  const handleConfirmCard = async (msg: ChatMessage) => {
    if (!msg.product || !msg.proposedUpdates) return;
    const msgId = msg.id;
    const cardValues = editableCardValues[msgId] || {};

    const updatesToApply: Record<string, number> = {};

    if (msg.proposedUpdates.sellingPrice) {
      const val = parseFloat(cardValues.sellingPrice || String(msg.proposedUpdates.sellingPrice.new));
      if (!isNaN(val)) updatesToApply.sellingPrice = val;
    }

    if (msg.proposedUpdates.purchasePrice) {
      const val = parseFloat(cardValues.purchasePrice || String(msg.proposedUpdates.purchasePrice.new));
      if (!isNaN(val)) updatesToApply.purchasePrice = val;
    }

    if (msg.proposedUpdates.stock) {
      const val = parseFloat(cardValues.stock || String(msg.proposedUpdates.stock.new));
      if (!isNaN(val)) updatesToApply.stock = val;
    }

    if (Object.keys(updatesToApply).length === 0) {
      setErrorMsg('कृपया कोई मान्य नंबर भरें।');
      return;
    }

    setConfirmingMessageId(msgId);
    setErrorMsg(null);

    try {
      const res = await api.post('/ai/voice-apply', {
        productId: msg.product.id,
        updates: updatesToApply,
      });

      if (res.data.success) {
        // Play payment box chime
        playChimeSound();

        // Speak Hindi feedback
        if (voiceOutputEnabled) {
          speakHindi(res.data.speechText || 'अपडेट हो गया');
        }

        // Dispatch real-time global event so POS & Inventory update immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kiranaos:product-updated', {
              detail: res.data.data,
            }),
          );
        }

        // Mark message as confirmed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  confirmed: true,
                  appliedDetails: res.data.message,
                }
              : m,
          ),
        );
      } else {
        setErrorMsg(res.data.message || 'अपडेट नहीं हो पाया।');
        playErrorSound();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'बदलाव सेव करने में समस्या आई।');
      playErrorSound();
    } finally {
      setConfirmingMessageId(null);
    }
  };

  const sampleSuggestions = [
    'डाबर रेड: खरीद ₹16, बिक्री ₹22',
    'पोहा का खरीद और बिक्री रेट क्या है?',
    'आज की कुल बिक्री और हिसाब बताओ',
    'टाटा नमक का रेट 30 कर दो',
    'कम स्टॉक वाले सामान दिखाओ',
  ];

  return (
    <>
      {/* ─── FLOATING ACTION BUTTON (DOCKED SAFELY ABOVE BOTTOM NAV ON MOBILE) ─── */}
      <div className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 lg:right-[430px] z-[80] flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white p-2.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-bold select-none"
          title="Kirana AI Copilot (Press V or C)"
        >
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-sm group-hover:bg-emerald-400/60 transition-all animate-pulse" />

          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin-slow" />
          </div>

          <div className="hidden sm:flex relative flex-col text-left">
            <span className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>Kirana AI Copilot</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-emerald-200">
                V
              </span>
            </span>
            <span className="text-[10px] text-emerald-200/80 font-medium">Voice & Chat Assistant</span>
          </div>
        </button>
      </div>

      {/* ─── COPILOT DRAWER (RIGHT SIDE SLIDE-OUT) ─── */}
      {isOpen && (
        <>
          {/* Subtle Backdrop */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[99] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[430px] bg-white border-l border-gray-200 shadow-2xl flex flex-col text-slate-900 animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    Kirana AI Copilot
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0C831F] animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Voice & Chat Assistant</p>
                </div>
              </div>

              {/* Actions: Lang toggle, Voice output toggle, Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLanguage((prev) => (prev === 'en-IN' ? 'hi-IN' : 'en-IN'))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200/60 transition-colors cursor-pointer"
                  title="Switch Language"
                >
                  {language === 'en-IN' ? '🌐 English' : '🇮🇳 Hindi'}
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceOutputEnabled((prev) => !prev)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    voiceOutputEnabled
                      ? 'bg-emerald-50 text-[#0C831F] border-emerald-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  title={voiceOutputEnabled ? 'Voice output active' : 'Voice output muted'}
                >
                  {voiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMessages([messages[0]])}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ml-0.5"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/70">
              {messages.length === 1 && messages[0].id === 'welcome' ? (
                <div className="py-8 px-3 flex flex-col items-center text-center animate-in fade-in-50 duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-[#0C831F] text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-3.5">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    How can I help you today?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[290px] leading-relaxed">
                    Update prices, add new items, or manage customer credit with voice or text.
                  </p>

                  {/* 4 Sleek Minimal Action Cards */}
                  <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('Tata salt sell 28 buy 22')}
                      className="p-3.5 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between min-h-[92px] active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0C831F] border border-emerald-100/80 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-xs font-bold text-slate-800 block group-hover:text-[#0C831F] transition-colors leading-tight">
                          Update Price
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          "Tata salt ₹28"
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Add Kurkure 20 packets to inventory')}
                      className="p-3.5 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between min-h-[92px] active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center">
                        <Boxes className="w-3.5 h-3.5" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-xs font-bold text-slate-800 block group-hover:text-[#0C831F] transition-colors leading-tight">
                          New Product
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          "Add Kurkure 20 pcs"
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Give 200 rupees credit to Ramesh')}
                      className="p-3.5 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between min-h-[92px] active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/80 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-xs font-bold text-slate-800 block group-hover:text-[#0C831F] transition-colors leading-tight">
                          Credit Book
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          "Give ₹200 to Ramesh"
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('What are today total sales?')}
                      className="p-3.5 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between min-h-[92px] active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100/80 flex items-center justify-center">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-xs font-bold text-slate-800 block group-hover:text-[#0C831F] transition-colors leading-tight">
                          Daily Summary
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          "Today's total sales"
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender Pill */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1 font-semibold">
                      {msg.sender === 'user' ? (
                        <>
                          <span>{msg.timestamp}</span>
                          {msg.isVoice ? (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Mic className="w-3 h-3" /> आवाज़
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-[#0C831F]" />
                          <span>Kirana AI</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#0C831F] text-white font-medium rounded-tr-xs shadow-2xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      <FormattedMessageText text={msg.text} />

                  {/* ─── CONFIRMATION CARD INSIDE CHAT ─── */}
                  {msg.type === 'CONFIRM_UPDATE' && msg.product && msg.proposedUpdates && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                      
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 uppercase tracking-wider">
                            {msg.product.category || 'General'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">
                            {msg.product.name}
                          </h4>
                          <span className="text-xs text-slate-500">
                            Unit: <span className="font-semibold text-slate-700">{msg.product.unit}</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Side-by-side Diffs with Editable Inputs */}
                      <div className="space-y-2">
                        {/* 1. SELLING PRICE */}
                        {msg.proposedUpdates.sellingPrice && (
                          <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                                Selling Price
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                ₹{msg.proposedUpdates.sellingPrice.old}
                              </span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-1">
                              <span className="text-[#0C831F] font-bold text-sm">₹</span>
                              <input
                                type="number"
                                step="any"
                                disabled={msg.confirmed}
                                value={editableCardValues[msg.id]?.sellingPrice ?? msg.proposedUpdates.sellingPrice.new}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableCardValues((prev) => ({
                                    ...prev,
                                    [msg.id]: { ...prev[msg.id], sellingPrice: val },
                                  }));
                                }}
                                className="w-20 text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded-lg px-2 py-1 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* 2. BUY / PURCHASE PRICE */}
                        {msg.proposedUpdates.purchasePrice && (
                          <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                                Cost / Buy Price
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                ₹{msg.proposedUpdates.purchasePrice.old}
                              </span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-1">
                              <span className="text-blue-600 font-bold text-sm">₹</span>
                              <input
                                type="number"
                                step="any"
                                disabled={msg.confirmed}
                                value={editableCardValues[msg.id]?.purchasePrice ?? msg.proposedUpdates.purchasePrice.new}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableCardValues((prev) => ({
                                    ...prev,
                                    [msg.id]: { ...prev[msg.id], purchasePrice: val },
                                  }));
                                }}
                                className="w-20 text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded-lg px-2 py-1 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* 3. STOCK */}
                        {msg.proposedUpdates.stock && (
                          <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                                Inventory Stock
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                {msg.proposedUpdates.stock.old} {msg.product.unit}
                              </span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                disabled={msg.confirmed}
                                value={editableCardValues[msg.id]?.stock ?? msg.proposedUpdates.stock.new}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableCardValues((prev) => ({
                                    ...prev,
                                    [msg.id]: { ...prev[msg.id], stock: val },
                                  }));
                                }}
                                className="w-16 text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded-lg px-2 py-1 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                              <span className="text-xs text-slate-500 font-medium">{msg.product.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmed State vs Action Buttons */}
                      {msg.confirmed ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{msg.appliedDetails || 'Changes saved successfully!'}</span>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <button
                            onClick={() => handleConfirmCard(msg)}
                            disabled={confirmingMessageId === msg.id}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#0C831F] hover:bg-[#0a6d1a] active:scale-[0.99] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {confirmingMessageId === msg.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm & Save Updates</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── CREATE NEW PRODUCT CARD INSIDE CHAT ─── */}
                  {msg.type === 'CREATE_NEW_PRODUCT' && msg.newProduct && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                      
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 uppercase tracking-wider">
                            🆕 New Product
                          </span>
                          <div className="mt-1">
                            <label className="text-[10px] font-bold text-slate-500 block uppercase">Product Name</label>
                            <input
                              type="text"
                              disabled={msg.confirmed}
                              value={editableCardValues[msg.id]?.name ?? msg.newProduct.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditableCardValues((prev) => ({
                                  ...prev,
                                  [msg.id]: { ...prev[msg.id], name: val },
                                }));
                              }}
                              className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-sm rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Selling Price */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-[#0C831F] block uppercase">Sell Price</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[#0C831F] font-bold text-sm">₹</span>
                            <input
                              type="number"
                              step="any"
                              disabled={msg.confirmed}
                              value={editableCardValues[msg.id]?.sellingPrice ?? msg.newProduct.sellingPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditableCardValues((prev) => ({
                                  ...prev,
                                  [msg.id]: { ...prev[msg.id], sellingPrice: val },
                                }));
                              }}
                              className="w-full text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded px-2 py-1 focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Buy Price */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-blue-600 block uppercase">Buy Price</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-blue-600 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              step="any"
                              disabled={msg.confirmed}
                              value={editableCardValues[msg.id]?.purchasePrice ?? msg.newProduct.purchasePrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditableCardValues((prev) => ({
                                  ...prev,
                                  [msg.id]: { ...prev[msg.id], purchasePrice: val },
                                }));
                              }}
                              className="w-full text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded px-2 py-1 focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Initial Stock */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-amber-600 block uppercase">Initial Stock</span>
                          <input
                            type="number"
                            step="any"
                            disabled={msg.confirmed}
                            value={editableCardValues[msg.id]?.stock ?? msg.newProduct.stock}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableCardValues((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], stock: val },
                              }));
                            }}
                            className="w-full text-right bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-sm rounded px-2 py-1 mt-1 focus:bg-white focus:outline-none"
                          />
                        </div>

                        {/* Unit */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">Unit</span>
                          <select
                            disabled={msg.confirmed}
                            value={editableCardValues[msg.id]?.unit ?? msg.newProduct.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableCardValues((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], unit: val },
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded px-2 py-1.5 mt-1 focus:bg-white focus:outline-none"
                          >
                            <option value="pcs">pcs</option>
                            <option value="packet">packet</option>
                            <option value="kg">kg</option>
                            <option value="gm">gm</option>
                            <option value="l">litre</option>
                          </select>
                        </div>
                      </div>

                      {/* Confirmed State vs Action Button */}
                      {msg.confirmed ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{msg.appliedDetails || 'Product added to store successfully!'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateNewProduct(msg)}
                          disabled={confirmingMessageId === msg.id}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#0C831F] hover:bg-[#0a6d1a] active:scale-[0.99] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {confirmingMessageId === msg.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>➕ Confirm & Add Product</span>
                            </>
                          )}
                        </button>
                      )}

                    </div>
                  )}

                  {/* ─── CONFIRM CREDIT / UDHAAR ENTRY CARD ─── */}
                  {msg.type === 'CONFIRM_CREDIT_ENTRY' && msg.creditEntry && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${
                            msg.creditEntry.type === 'GIVE_CREDIT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {msg.creditEntry.type === 'GIVE_CREDIT' ? '🔴 Credit Given (You Gave)' : '🟢 Payment Received (You Got)'}
                        </span>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-2">
                        {/* Customer Name */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Customer Name</label>
                          <input
                            type="text"
                            disabled={msg.confirmed}
                            value={editableCardValues[msg.id]?.name ?? msg.creditEntry.customerName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableCardValues((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], name: val },
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Customer Mobile */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Mobile Number</label>
                          <input
                            type="tel"
                            disabled={msg.confirmed}
                            placeholder="9876543210"
                            value={editableCardValues[msg.id]?.mobile ?? msg.creditEntry.customerMobile ?? ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setEditableCardValues((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], mobile: val },
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Amount */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Amount (₹)</label>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-slate-800 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              step="any"
                              disabled={msg.confirmed}
                              value={editableCardValues[msg.id]?.amount ?? msg.creditEntry.amount}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditableCardValues((prev) => ({
                                  ...prev,
                                  [msg.id]: { ...prev[msg.id], amount: val },
                                }));
                              }}
                              className={`w-full text-right bg-slate-50 border text-slate-900 font-black text-base rounded px-2 py-1 focus:outline-none ${
                                msg.creditEntry.type === 'GIVE_CREDIT' ? 'border-rose-300' : 'border-emerald-300'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Description / Note</label>
                          <input
                            type="text"
                            disabled={msg.confirmed}
                            value={editableCardValues[msg.id]?.description ?? msg.creditEntry.description ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableCardValues((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], description: val },
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Confirmed State vs Action Button */}
                      {msg.confirmed ? (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{msg.appliedDetails || 'Credit transaction recorded!'}</span>
                          </div>

                          {msg.creditReminder?.whatsappUrl && (
                            <button
                              onClick={() => window.open(msg.creditReminder?.whatsappUrl, '_blank')}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                              <span>📲 Send WhatsApp Reminder</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmCreditEntry(msg)}
                          disabled={confirmingMessageId === msg.id}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 text-white ${
                            msg.creditEntry.type === 'GIVE_CREDIT'
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-[#0C831F] hover:bg-[#0a6d1a]'
                          }`}
                        >
                          {confirmingMessageId === msg.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Save to Credit Book</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ─── CREDIT REMINDER CARD ─── */}
                  {msg.type === 'CREDIT_REMINDER' && msg.creditReminder && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 uppercase tracking-wider">
                          📲 Payment Reminder
                        </span>
                        <span className="text-xs font-black text-rose-600">
                          ₹{msg.creditReminder.balance} Due
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs">
                        <div className="font-bold text-slate-900 text-sm">{msg.creditReminder.customerName}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">📞 {msg.creditReminder.mobile}</div>
                        <div className="text-slate-700 text-[11px] mt-2 whitespace-pre-line bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                          {msg.creditReminder.reminderMsg}
                        </div>
                      </div>

                      <button
                        onClick={() => window.open(msg.creditReminder?.whatsappUrl, '_blank')}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-white" />
                        <span>Send WhatsApp Reminder</span>
                      </button>
                    </div>
                  )}

                  {/* ─── CREDIT SUMMARY / DEBTOR LIST ─── */}
                  {(msg.type === 'CREDIT_SUMMARY' || msg.type === 'CREDIT_REMINDER_LIST') && (msg.creditSummary?.dueList || msg.dueList) && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-rose-500" />
                          Credit Due List (Debtors)
                        </span>
                        {msg.creditSummary?.totalDue !== undefined && (
                          <span className="text-xs font-black text-rose-600">
                            Total: ₹{msg.creditSummary.totalDue}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {(msg.creditSummary?.dueList || msg.dueList || []).map((debtor) => (
                          <div
                            key={debtor.id}
                            className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{debtor.name}</div>
                              <div className="text-[10px] text-slate-500">{debtor.mobile}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-rose-600">₹{debtor.balance}</span>
                              <button
                                onClick={() => window.open(debtor.whatsappUrl, '_blank')}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare className="w-3.5 h-3.5 fill-emerald-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )))}

            {/* Error Message banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* AI is thinking indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-white p-2.5 px-3 rounded-2xl border border-slate-200 shadow-2xs w-fit">
                <div className="w-3 h-3 border-2 border-slate-200 border-t-[#0C831F] rounded-full animate-spin" />
                <span>AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── LIVE VOICE BAR (WHEN LISTENING) ─── */}
          {isListening && (
            <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-800 shrink-0">Listening...</span>
                <span className="text-xs text-slate-700 italic truncate font-medium">
                  "{transcript || 'Speak now...'}"
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold shrink-0 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* ─── FLOATING PILL INPUT BAR (TEXT + VOICE) ─── */}
          <div className="p-3 border-t border-slate-200/80 bg-white/95 backdrop-blur-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white shadow-md shadow-red-200 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 active:scale-95'
                }`}
                title={isListening ? 'Stop Mic' : 'Click to Speak'}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-700" />}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  language === 'hi-IN'
                    ? 'दाम, नया सामान या उधार बोलें / लिखें...'
                    : 'Ask price, add item or record credit...'
                }
                className="flex-1 bg-slate-100/90 border border-slate-200/80 text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 font-medium transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-[#0C831F] hover:bg-[#0a6d1a] disabled:bg-slate-200 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2 font-medium">
              <span>Prices • New Items • Credit Book</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Press V • Enter</span>
            </div>
          </div>

        </div>
        </>
      )}
    </>
  );
}
