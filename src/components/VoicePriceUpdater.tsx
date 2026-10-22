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

export default function VoicePriceUpdater() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
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
      text: '🙏 **नमस्ते जी! मैं आपका किराना AI सहायक हूँ।**\n\nआप बोलकर या लिखकर:\n• **दाम व स्टॉक** बदल सकते हैं ("टाटा नमक बिक्री 28 खरीद 22")\n• **नया सामान** जोड़ सकते हैं ("कुरकुरे ग्रीन 20 पैकेट ऐड करो")\n• **उधार खाता** दर्ज कर सकते हैं ("रमेश को 200 का उधार लिखो")\n• **पेमेंट जमा** कर सकते हैं ("रमेश ने 200 जमा किया")\n• **WhatsApp रिमाइंडर** भेज सकते हैं ("रमेश को रिमाइंडर भेजो")\n• **आज की बिक्री व कुल उधार** पूछ सकते हैं ("आज की बिक्री कितनी है?")\n\n*माइक दबाकर बोलें या नीचे लिखें।*',
      timestamp: 'अभी',
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
      {/* ─── FLOATING ACTION BUTTON (DOCKED SAFELY AWAY FROM CART) ─── */}
      <div className="fixed bottom-6 right-6 lg:right-[430px] z-[80] flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-bold select-none"
          title="किराना AI असिस्टेंट (दबाएं V या C)"
        >
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-sm group-hover:bg-emerald-400/60 transition-all animate-pulse" />

          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin-slow" />
          </div>

          <div className="relative flex flex-col text-left">
            <span className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>किराना AI Copilot</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-emerald-200">
                V
              </span>
            </span>
            <span className="text-[10px] text-emerald-200/80 font-medium">बोल कर या चैट से बदलें</span>
          </div>
        </button>
      </div>

      {/* ─── COPILOT DRAWER (RIGHT SIDE SLIDE-OUT) ─── */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/40">
                <Sparkles className="w-5 h-5 text-emerald-100" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  KiranaOS AI Copilot
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">वॉइस + चैट से खरीद, बिक्री व स्टॉक बदलें</p>
              </div>
            </div>

            {/* Actions: Lang toggle, Voice output toggle, Close */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLanguage((prev) => (prev === 'hi-IN' ? 'en-IN' : 'hi-IN'))}
                className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-colors"
                title="भाषा बदलें"
              >
                {language === 'hi-IN' ? '🇮🇳 हिन्दी' : '🌐 Hinglish'}
              </button>

              <button
                onClick={() => setVoiceOutputEnabled((prev) => !prev)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  voiceOutputEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={voiceOutputEnabled ? 'आवाज़ चालू है (Mute करें)' : 'आवाज़ बंद है (Unmute करें)'}
              >
                {voiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="चैट साफ़ करें"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="बंद करें (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/50 flex gap-1.5 overflow-x-auto scrollbar-none text-xs">
            {sampleSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 font-medium transition-colors hover:text-emerald-300 cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Pill */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1 font-semibold">
                  {msg.sender === 'user' ? (
                    <>
                      <span>{msg.timestamp}</span>
                      {msg.isVoice ? (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <Mic className="w-3 h-3" /> बोला गया
                        </span>
                      ) : (
                        <span>टाइप किया</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Kirana AI</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-br-xs shadow-md'
                      : 'bg-slate-850 text-slate-200 border border-slate-800 rounded-bl-xs shadow-md'
                  }`}
                >
                  {/* Markdown / Formatted text */}
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* ─── CONFIRMATION CARD INSIDE CHAT ─── */}
                  {msg.type === 'CONFIRM_UPDATE' && msg.product && msg.proposedUpdates && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-4">
                      
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                            {msg.product.category || 'General'}
                          </span>
                          <h4 className="font-extrabold text-white text-base mt-1">
                            {msg.product.name}
                          </h4>
                          <span className="text-xs text-slate-400">
                            इकाई (Unit): <span className="font-bold text-white">{msg.product.unit}</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Side-by-side Diffs with Editable Inputs */}
                      <div className="space-y-3">
                        {/* 1. SELLING PRICE */}
                        {msg.proposedUpdates.sellingPrice && (
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                बिक्री मूल्य (Selling Price)
                              </span>
                              <span className="text-xs text-slate-500 line-through">
                                ₹{msg.proposedUpdates.sellingPrice.old}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-400 font-bold text-sm">₹</span>
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
                                className="w-20 text-right bg-slate-900 border border-emerald-500/60 text-white font-black text-base rounded px-2 py-0.5 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* 2. BUY / PURCHASE PRICE */}
                        {msg.proposedUpdates.purchasePrice && (
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                खरीद दाम (Buy Price / Cost)
                              </span>
                              <span className="text-xs text-slate-500 line-through">
                                ₹{msg.proposedUpdates.purchasePrice.old}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="flex items-center gap-1">
                              <span className="text-blue-400 font-bold text-sm">₹</span>
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
                                className="w-20 text-right bg-slate-900 border border-blue-500/60 text-white font-black text-base rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* 3. STOCK */}
                        {msg.proposedUpdates.stock && (
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                स्टॉक (Inventory Stock)
                              </span>
                              <span className="text-xs text-slate-500 line-through">
                                {msg.proposedUpdates.stock.old} {msg.product.unit}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
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
                                className="w-20 text-right bg-slate-900 border border-amber-500/60 text-white font-black text-base rounded px-2 py-0.5 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                              />
                              <span className="text-xs text-slate-400 font-bold">{msg.product.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmed State vs Action Buttons */}
                      {msg.confirmed ? (
                        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{msg.appliedDetails || 'बदलाव सफलतापूर्वक सेव हो गया है!'}</span>
                        </div>
                      ) : (
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => handleConfirmCard(msg)}
                            disabled={confirmingMessageId === msg.id}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {confirmingMessageId === msg.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                हाँ, पक्का करो (Confirm)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── CREATE NEW PRODUCT CARD INSIDE CHAT ─── */}
                  {msg.type === 'CREATE_NEW_PRODUCT' && msg.newProduct && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border-2 border-emerald-500/50 space-y-4 shadow-xl">
                      
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                            🆕 नया सामान (New Product)
                          </span>
                          <div className="mt-1">
                            <label className="text-[10px] font-bold text-slate-400 block uppercase">सामान का नाम (Name)</label>
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
                              className="w-full bg-slate-950 border border-slate-700 text-white font-bold text-base rounded-lg px-2.5 py-1 focus:border-emerald-400 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          <Boxes className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Selling Price */}
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-bold text-emerald-400 block uppercase">बिक्री रेट (Sell)</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-emerald-400 font-bold text-sm">₹</span>
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
                              className="w-full text-right bg-slate-900 border border-slate-700 text-white font-black text-sm rounded px-2 py-1 focus:border-emerald-400 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Buy Price */}
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-bold text-blue-400 block uppercase">खरीद मूल्य (Buy)</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-blue-400 font-bold text-sm">₹</span>
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
                              className="w-full text-right bg-slate-900 border border-slate-700 text-white font-black text-sm rounded px-2 py-1 focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Initial Stock */}
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-bold text-amber-400 block uppercase">शुरुआती स्टॉक</span>
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
                            className="w-full text-right bg-slate-900 border border-slate-700 text-white font-black text-sm rounded px-2 py-1 mt-1 focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        {/* Unit */}
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">इकाई (Unit)</span>
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
                            className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded px-2 py-1.5 mt-1 focus:border-emerald-400 focus:outline-none"
                          >
                            <option value="pcs">pcs (पीस)</option>
                            <option value="packet">packet (पैकेट)</option>
                            <option value="kg">kg (किलो)</option>
                            <option value="gm">gm (ग्राम)</option>
                            <option value="l">l (लीटर)</option>
                          </select>
                        </div>
                      </div>

                      {/* Confirmed State vs Action Button */}
                      {msg.confirmed ? (
                        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{msg.appliedDetails || 'नया सामान दुकान में जुड़ गया है!'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateNewProduct(msg)}
                          disabled={confirmingMessageId === msg.id}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {confirmingMessageId === msg.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              ➕ हाँ, नया सामान जोड़ो (Confirm & Add)
                            </>
                          )}
                        </button>
                      )}

                    </div>
                  )}

                  {/* ─── CONFIRM CREDIT / UDHAAR ENTRY CARD ─── */}
                  {msg.type === 'CONFIRM_CREDIT_ENTRY' && msg.creditEntry && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border-2 border-slate-700 space-y-4 shadow-xl">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="space-y-1">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                              msg.creditEntry.type === 'GIVE_CREDIT'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {msg.creditEntry.type === 'GIVE_CREDIT' ? '🔴 उधार खाता (You Gave)' : '🟢 जमा पेमेंट (You Got)'}
                          </span>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-3">
                        {/* Customer Name */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">ग्राहक का नाम (Customer)</label>
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
                            className="w-full bg-slate-950 border border-slate-700 text-white font-bold text-sm rounded-lg px-2.5 py-1.5 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        {/* Customer Mobile */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">मोबाइल नंबर (Mobile No)</label>
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
                            className="w-full bg-slate-950 border border-slate-700 text-white font-bold text-sm rounded-lg px-2.5 py-1.5 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        {/* Amount */}
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">राशि (Amount in ₹)</label>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-white font-bold text-base">₹</span>
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
                              className={`w-full text-right bg-slate-900 border text-white font-black text-lg rounded px-2 py-1 focus:outline-none ${
                                msg.creditEntry.type === 'GIVE_CREDIT' ? 'border-rose-500/60' : 'border-emerald-500/60'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">सामान / नोट (Description)</label>
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
                            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Confirmed State vs Action Button */}
                      {msg.confirmed ? (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{msg.appliedDetails || 'खाता एंट्री सफलतापूर्वक सेव हो गई!'}</span>
                          </div>

                          {msg.creditReminder?.whatsappUrl && (
                            <button
                              onClick={() => window.open(msg.creditReminder?.whatsappUrl, '_blank')}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 fill-white" />
                              <span>📲 WhatsApp रिमाइंडर भेजें</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmCreditEntry(msg)}
                          disabled={confirmingMessageId === msg.id}
                          className={`w-full py-3 px-4 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-white ${
                            msg.creditEntry.type === 'GIVE_CREDIT'
                              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                          }`}
                        >
                          {confirmingMessageId === msg.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>हाँ, खाता में दर्ज करो (Save Khata)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ─── CREDIT REMINDER CARD ─── */}
                  {msg.type === 'CREDIT_REMINDER' && msg.creditReminder && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border-2 border-emerald-500/50 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          📲 Payment Reminder
                        </span>
                        <span className="text-sm font-black text-rose-400">
                          ₹{msg.creditReminder.balance} बाकी
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                        <div className="font-bold text-white text-sm">{msg.creditReminder.customerName}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">📞 {msg.creditReminder.mobile}</div>
                        <div className="text-slate-300 text-[11px] mt-2 whitespace-pre-line bg-slate-900 p-2 rounded border border-slate-800">
                          {msg.creditReminder.reminderMsg}
                        </div>
                      </div>

                      <button
                        onClick={() => window.open(msg.creditReminder?.whatsappUrl, '_blank')}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 fill-white" />
                        <span>WhatsApp पर रिमाइंडर भेजें</span>
                      </button>
                    </div>
                  )}

                  {/* ─── CREDIT SUMMARY / DEBTOR LIST ─── */}
                  {(msg.type === 'CREDIT_SUMMARY' || msg.type === 'CREDIT_REMINDER_LIST') && (msg.creditSummary?.dueList || msg.dueList) && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-rose-400" />
                          उधार बकायेदार (Debtor List)
                        </span>
                        {msg.creditSummary?.totalDue !== undefined && (
                          <span className="text-xs font-black text-rose-400">
                            कुल: ₹{msg.creditSummary.totalDue}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {(msg.creditSummary?.dueList || msg.dueList || []).map((debtor) => (
                          <div
                            key={debtor.id}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-white truncate">{debtor.name}</div>
                              <div className="text-[10px] text-slate-400">{debtor.mobile}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-black text-rose-400">₹{debtor.balance}</span>
                              <button
                                onClick={() => window.open(debtor.whatsappUrl, '_blank')}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare className="w-3 h-3 fill-white" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}

            {/* Error Message banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* AI is thinking indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-slate-850 p-3 rounded-2xl border border-slate-800 w-fit">
                <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <span>AI जवाब तैयार कर रहा है...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── LIVE VOICE BAR (WHEN LISTENING) ─── */}
          {isListening && (
            <div className="px-5 py-3 bg-emerald-950/80 border-t border-emerald-500/40 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-black text-emerald-200 shrink-0">सुन रहे हैं...</span>
                <span className="text-xs text-white font-medium italic truncate">
                  "{transcript || 'बोलिए...'}"
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold shrink-0 cursor-pointer"
              >
                पूरा हुआ
              </button>
            </div>
          )}

          {/* ─── INPUT BAR (TEXT + VOICE) ─── */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/90">
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
                className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60'
                }`}
                title={isListening ? 'माइक बंद करें' : 'बोलने के लिए दबाएं'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  language === 'hi-IN'
                    ? 'यहाँ लिखें या माइक से बोलें (उदा: डाबर रेड 22 कर दो)...'
                    : 'Type or speak (e.g. Dabur red buy 16 sell 22)...'
                }
                className="flex-1 bg-slate-900 border border-slate-750 text-white placeholder-slate-500 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-500 font-medium"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="भेजें"
              >
                <Send className="w-5 h-5 text-emerald-400" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
              <span>दुकानदार AI: खरीद, बिक्री व स्टॉक तीनों सपोर्टेड</span>
              <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-slate-400">V वॉइस • Enter भेजें</span>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
