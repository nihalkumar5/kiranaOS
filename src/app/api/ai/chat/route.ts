import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { processKiranaCopilotWithGemini } from '@/lib/ai-assistant';

const HindiSynonyms: Record<string, string> = {
  namak: 'salt',
  tel: 'oil',
  sabun: 'soap',
  doodh: 'milk',
  chini: 'sugar',
  shakkar: 'sugar',
  aata: 'atta',
  chawal: 'rice',
  biscuit: 'biscuit',
  chota: 'chota',
  bada: 'bada',
  laal: 'red',
  dalia: 'dalia',
  anjeer: 'anjeer',
  namkeen: 'namkeen',
  masala: 'masala',
  haldi: 'haldi',
  mirch: 'chilli',
  chilli: 'chilli',
};

const HindiNumberWords: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  chhah: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20,
  ikees: 21, baees: 22, teis: 23, chaubees: 24, pachis: 25, pachees: 25,
  chhabis: 26, sattais: 27, atthaees: 28, untees: 29, tees: 30,
  iktees: 31, battees: 32, tentis: 33, chautis: 34, paintis: 35,
  chhattis: 36, saintis: 37, adhtis: 38, untalis: 39, chalis: 40,
  paintalis: 45, pachaas: 50, pachas: 50, pachpan: 55, saath: 60, sath: 60,
  painsath: 65, sattar: 70, pachhattar: 75, assi: 80, pachasi: 85,
  nabbe: 90, panchanve: 95, sau: 100, 'dedh sau': 150, 'do sau': 200, 'dhai sau': 250,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  पंद्रह: 15, बीस: 20, पच्चीस: 25, तीस: 30, पैंतीस: 35, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, सौ: 100
};

const DevanagariDigits: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const HindiDevaWordMap: Record<string, string> = {
  'टाटा': 'tata', 'नमक': 'salt namak', 'डाबर': 'dabur', 'रेड': 'red', 'पोहा': 'poha',
  'तेल': 'oil tel', 'फॉर्च्यून': 'fortune', 'मैगी': 'maggi', 'सर्फ': 'surf', 'एक्सेल': 'excel',
  'साबुन': 'soap sabun', 'दूध': 'milk doodh', 'अमूल': 'amul', 'गुडनाईट': 'goodnight',
  'डेटॉल': 'dettol', 'पेप्सोडेंट': 'pepsodent', 'सेवई': 'sewai', 'दलिया': 'dalia',
  'सनसिल्क': 'sunsilk', 'नवरत्न': 'navratna', 'कोलगेट': 'colgate', 'ब्रिटानिया': 'britannia',
  'बिस्कुट': 'biscuit', 'चीनी': 'sugar chini', 'शक्कर': 'sugar shakkar', 'चाय': 'tea chai',
  'आटा': 'atta flour', 'चावल': 'rice chawal', 'दाल': 'dal', 'छोटा': 'chota', 'बड़ा': 'bada',
  'हरा': 'green', 'काला': 'black', 'नीला': 'blue', 'उजाला': 'ujala', 'व्हील': 'wheel',
  'टाइड': 'tide', 'विम': 'vim', 'फेना': 'fena', 'ग्लूकॉन': 'glucon', 'बोर्नविटा': 'bournvita',
  'हनी': 'honey', 'शहद': 'honey'
};

const DevanagariStopWords = [
  'का', 'की', 'के', 'को', 'से', 'में', 'पर', 'वाले', 'वाली', 'वाला',
  'रेट', 'दाम', 'भाव', 'रुपया', 'रुपये', 'रुपय', 'रुपए', 'कर', 'दो', 'करो',
  'दीजिए', 'करना', 'है', 'था', 'होगी', 'होगा', 'स्टॉक', 'ऐड', 'जोड़', 'जोड़ो',
  'बढ़ा', 'बढ़ाओ', 'कम', 'घटा', 'घटाओ', 'पैकेट', 'पीस', 'किलो', 'ग्राम', 'लीटर',
  'नया', 'पुराना', 'खरीद', 'लागत'
];

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const rawMessage = (body.message || '').trim();

    if (!rawMessage) {
      return NextResponse.json({
        type: 'TEXT',
        reply: 'नमस्ते! बोलिए, क्या मदद करूँ? आप किसी भी सामान का खरीद दाम, बिक्री रेट या स्टॉक पूछ और बदल सकते हैं।',
        speechText: 'Namaste! boliye, kya madad karu?',
      });
    }

    // ─── GEMINI AI COPILOT (PRIMARY LLM ENGINE) ───
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) {
      try {
        const geminiRes = await processKiranaCopilotWithGemini(rawMessage, user.storeId);
        if (geminiRes) {
          return NextResponse.json(geminiRes);
        }
      } catch (geminiError) {
        console.error('Gemini Copilot fallback triggered:', geminiError);
      }
    }

    // Normalize text
    let normalized = rawMessage.toLowerCase();
    for (const [d, v] of Object.entries(DevanagariDigits)) {
      normalized = normalized.replaceAll(d, v);
    }
    normalized = normalized.replace(/\b(kar|de|badha|ghata|jod|hata|karo|badhao|ghatao|bhej|bhejo|likh|likho|bata|batao|dikha|dikhao)\s+(do|dijiye|de)\b/gi, '$1_verb');

    // Hindi numbers
    const sortedWords = Object.keys(HindiNumberWords).sort((a, b) => b.length - a.length);
    for (const word of sortedWords) {
      const reg = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(reg, String(HindiNumberWords[word]));
    }

    // ─── INTENT 1: TODAY'S SALES / REVENUE CHECK ───
    const isSalesQuery = (
      /\b(aaj\s*ki\s*bikri|aaj\s*ka\s*hisab|today\s*sales|total\s*sale|aaj\s*kitna\s*bika|aaj\s*kitni\s*bikri|aaj\s*kitne\s*bill|aaj\s*ka\s*collection|total\s*kamai|bikri\s*kitni)\b/i.test(normalized)
      || /आज की बिक्री|आज का हिसाब|कुल बिक्री|कितना बिका/i.test(rawMessage)
    ) && !/\b(kar\s*do|kardo|kar_verb|add|khareed|buy|naya|set|change)\b/i.test(normalized);

    if (isSalesQuery) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          storeId: user.storeId,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
      });

      let totalSales = 0;
      let cashSales = 0;
      let upiSales = 0;
      for (const o of orders) {
        const amt = Number(o.totalAmount);
        totalSales += amt;
        if (o.paymentMode === 'CASH') cashSales += amt;
        else if (o.paymentMode === 'UPI') upiSales += amt;
      }

      const reply = `📊 **आज का हिसाब (Today's Sales)**:\n• कुल बिक्री: **₹${totalSales.toLocaleString('en-IN')}**\n• कुल बिल्स: **${orders.length}**\n• कैश (Cash): **₹${cashSales.toLocaleString('en-IN')}**\n• यूपीआई (UPI): **₹${upiSales.toLocaleString('en-IN')}**`;
      const speechText = `Aaj kul ₹${totalSales} ki bikri hui hai aur ${orders.length} bill bane hain`;

      return NextResponse.json({
        type: 'SALES_INFO',
        reply,
        speechText,
        salesData: { totalSales, billsCount: orders.length, cashSales, upiSales },
      });
    }

    // ─── INTENT: VOICE BILLING (ADD TO POS CART) ───
    const isCartAdd = (
      /\b(cart|bill|basket)\b.*\b(daal|daalo|jod|jodo|add|rakh|rakho)\b/i.test(normalized) ||
      /\b(add|daal|daalo|jod|jodo)\b.*\b(cart|bill|basket)\b/i.test(normalized) ||
      /कार्ट में|बिल में जोड़|बिल में डाल|कार्ट में ऐड/i.test(rawMessage)
    );

    if (isCartAdd) {
      // Extract quantity
      const qtyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:packet|pcs|piece|pkt|kg|gm|liter|l|kilo)?/i);
      const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

      // Clean query
      let prodQuery = normalized
        .replace(/\b(cart|bill|basket|daal|daalo|daal_verb|jod|jodo|jod_verb|add|rakh|rakho|me|mein|ko|aur|bhi|packet|pcs|piece|pkt|kg|gm|liter|kilo)\b/gi, ' ')
        .replace(/\d+(?:\.\d+)?/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!prodQuery) {
        prodQuery = rawMessage
          .replace(/कार्ट|बिल|में|डालो|डाल|दो|दीजिए|जोड़ो|जोड़|ऐड|पैकेट|किलो|पीस|[०-९0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const products = await prisma.product.findMany({
        where: { storeId: user.storeId },
        include: { category: true },
      });

      let matchedProduct = null;
      let highestScore = 0;

      for (const p of products) {
        const pTokens = p.name.toLowerCase().split(/\s+/);
        let score = 0;
        for (const word of prodQuery.split(/\s+/)) {
          if (!word || word.length < 2) continue;
          if (p.name.toLowerCase().includes(word)) score += 3;
          if (pTokens.some((t) => t.startsWith(word) || word.startsWith(t))) score += 2;
        }
        if (score > highestScore) {
          highestScore = score;
          matchedProduct = p;
        }
      }

      if (matchedProduct && highestScore > 0) {
        const itemSellingPrice = Number(matchedProduct.sellingPrice);
        const itemTotal = itemSellingPrice * quantity;
        const reply = `🛒 **${matchedProduct.name}** (${quantity} ${matchedProduct.unit}) बिल कार्ट में जोड़ दिया गया है!\n• मूल्य: **₹${itemTotal}** (₹${itemSellingPrice} प्रति ${matchedProduct.unit})\n\n*POS Counter पर यह आइटम तुरंत ऐड हो गया है।*`;
        const speechText = `${quantity} ${matchedProduct.name} bill cart me jod diya hai`;

        return NextResponse.json({
          type: 'ADD_TO_CART',
          product: {
            id: matchedProduct.id,
            name: matchedProduct.name,
            barcode: matchedProduct.barcode,
            sellingPrice: itemSellingPrice,
            purchasePrice: Number(matchedProduct.purchasePrice),
            stock: Number(matchedProduct.stock),
            unit: matchedProduct.unit,
            gst: Number(matchedProduct.gst || 0),
          },
          quantity,
          reply,
          speechText,
        });
      }
    }

    // ─── INTENT 2: LOW STOCK INQUIRY ───
    const isLowStockQuery = /\b(low\s*stock|khatam|kam\s*maal|stock\s*alert|khatam\s*hone)\b/i.test(normalized)
      || /कम स्टॉक|माल खत्म|खत्म होने वाला/i.test(rawMessage);

    if (isLowStockQuery) {
      const lowStockProducts = await prisma.product.findMany({
        where: {
          storeId: user.storeId,
          stock: { lte: 5 },
        },
        take: 8,
        orderBy: { stock: 'asc' },
      });

      if (lowStockProducts.length === 0) {
        return NextResponse.json({
          type: 'TEXT',
          reply: '✅ सभी सामानों का पर्याप्त स्टॉक उपलब्ध है। कोई भी आइटम 5 से कम नहीं है।',
          speechText: 'Sabhi samano ka paryapt stock upalabdha hai',
        });
      }

      const itemsList = lowStockProducts
        .map((p) => `• **${p.name}**: सिर्फ **${p.stock} ${p.unit}** बचा है`)
        .join('\n');

      return NextResponse.json({
        type: 'LOW_STOCK',
        reply: `⚠️ **कम स्टॉक वाले सामान (Low Stock Alert)**:\n${itemsList}\n\n*मात्रा बढ़ाने के लिए बोलें: "[सामान का नाम] का स्टॉक [नंबर] बढ़ा दो"*`,
        speechText: `${lowStockProducts.length} items ka stock kam hai`,
        items: lowStockProducts.map((p) => ({ id: p.id, name: p.name, stock: parseFloat(p.stock.toString()), unit: p.unit })),
      });
    }

    // ─── INTENT: CREDIT / UDHAAR & REMINDER ───
    const isCreditOrReminder = (
      /\b(udhar|udhaar|khata|jama|reminder|takada|remind|bakaya|baaki)\b/i.test(normalized) ||
      /उधार|खाता|जमा|रिमाइंडर|तकादा|बाकी|बकाया/i.test(rawMessage)
    ) && !/\b(maggi|namak|atta|chini|soap|tel|oil|shampoo|surf|biscuit|packet|kilo|kg|stock|price|bikri|daam|rate)\b/i.test(normalized);

    if (isCreditOrReminder) {
      // 1. Is it a Reminder inquiry or request?
      const isReminderRequest = /\b(reminder|bhej\s*do|bhejo|takada|remind)\b/i.test(normalized) ||
        /रिमाइंडर|भेज दो|भेजो|तकादा/i.test(rawMessage);

      // 2. Is it a Payment Received (Jama)?
      const isPaymentReceived = /\b(jama|mila|payment)\b/i.test(normalized) ||
        /जमा|मिला|पेमेंट/i.test(rawMessage);

      // 3. Is it a general Udhaar inquiry? (Kul udhar kitna hai? / Kiska baaki hai?)
      const isGeneralCreditInquiry = (
        /\b(kul\s*udhar|total\s*udhar|kitna\s*udhar|kiska\s*baaki|udhar\s*kitna|khata\s*dikhao)\b/i.test(normalized) ||
        /कुल उधार|कितना उधार|किसका बाकी|उधार कितना|खाता दिखाओ/i.test(rawMessage)
      ) && !/\b(\d+)\b/.test(normalized);

      const store = await prisma.store.findUnique({
        where: { id: user.storeId },
        select: { name: true, upiId: true },
      });

      // Case A: General Udhaar inquiry
      if (isGeneralCreditInquiry) {
        const allCust = await prisma.customer.findMany({
          where: { storeId: user.storeId },
          include: { creditTransactions: true },
        });

        let totalDue = 0;
        const dueList: any[] = [];

        for (const c of allCust) {
          let bal = 0;
          for (const t of c.creditTransactions) {
            if (t.type === 'GIVE_CREDIT') bal += Number(t.amount);
            else if (t.type === 'PAYMENT_RECEIVED') bal -= Number(t.amount);
          }
          bal = Math.round(bal * 100) / 100;
          if (bal > 0) {
            totalDue += bal;
            const cleanMobile = c.mobile.replace(/\D/g, '').slice(-10);
            const msg = `🙏 Namaste ${c.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${bal} hai.\nKripya samay par bhugtan karein.${store?.upiId ? `\n📲 UPI ID: ${store.upiId}` : ''}\n\nDhanyawad! 🙏`;
            dueList.push({
              id: c.id,
              name: c.name,
              mobile: c.mobile,
              balance: bal,
              whatsappUrl: `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`,
              reminderMsg: msg,
            });
          }
        }

        dueList.sort((a, b) => b.balance - a.balance);

        const reply = `📒 **कुल उधार खाता (Total Market Credit)**:\n• कुल बाकी राशि: **₹${totalDue.toLocaleString('en-IN')}**\n• कुल बकायेदार: **${dueList.length} ग्राहक**\n\n${
          dueList.slice(0, 5).map((d) => `• **${d.name}**: ₹${d.balance}`).join('\n')
        }`;

        return NextResponse.json({
          type: 'CREDIT_SUMMARY',
          reply,
          speechText: `Dukaan ka kul ₹${totalDue} rupaye udhaar baaki hai ${dueList.length} grahakon ke paas`,
          creditSummary: {
            totalDue,
            dueList: dueList.slice(0, 10),
          },
        });
      }

      // Case B: Reminder for customer
      if (isReminderRequest) {
        let candidateName = normalized
          .replace(/\b(reminder|bhej_verb|bhej|bhejo|takada|remind|udhar|udhaar|ka|ki|ke|ko|se|karo|dijiye|kar_verb|do)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!candidateName) {
          candidateName = rawMessage
            .replace(/रिमाइंडर|भेज\s*दो|भेजो|तकादा|उधार|का|की|के|को|से|करो|दीजिए/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        if (candidateName) {
          const matchCust = await prisma.customer.findFirst({
            where: {
              storeId: user.storeId,
              OR: [
                { name: { contains: candidateName, mode: 'insensitive' } },
                { mobile: { contains: candidateName } },
              ],
            },
            include: { creditTransactions: true },
          });

          if (matchCust) {
            let bal = 0;
            for (const t of matchCust.creditTransactions) {
              if (t.type === 'GIVE_CREDIT') bal += Number(t.amount);
              else if (t.type === 'PAYMENT_RECEIVED') bal -= Number(t.amount);
            }
            bal = Math.round(bal * 100) / 100;

            const cleanMobile = matchCust.mobile.replace(/\D/g, '').slice(-10);
            const msg = `🙏 Namaste ${matchCust.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${bal} hai.\nKripya samay par bhugtan karein.${store?.upiId ? `\n📲 UPI ID: ${store.upiId}` : ''}\n\nDhanyawad! 🙏`;
            const whatsappUrl = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`;

            return NextResponse.json({
              type: 'CREDIT_REMINDER',
              reply: `📱 **${matchCust.name} का पेमेंट रिमाइंडर तैयार है**:\n• बाकी राशि: **₹${bal}**\n• मोबाइल: **${matchCust.mobile}**\n\n*नीचे दिए गए बटन पर क्लिक करके सीधे WhatsApp पर रिमाइंडर भेजें।*`,
              speechText: `${matchCust.name} ji ka ₹${bal} rupaye baaki hai. WhatsApp reminder taiyaar hai.`,
              creditReminder: {
                customerName: matchCust.name,
                mobile: matchCust.mobile,
                balance: bal,
                whatsappUrl,
                reminderMsg: msg,
              },
            });
          }
        }

        // If no specific customer matched, return top debtors
        const allCust = await prisma.customer.findMany({
          where: { storeId: user.storeId },
          include: { creditTransactions: true },
        });

        const dueList: any[] = [];
        for (const c of allCust) {
          let bal = 0;
          for (const t of c.creditTransactions) {
            if (t.type === 'GIVE_CREDIT') bal += Number(t.amount);
            else if (t.type === 'PAYMENT_RECEIVED') bal -= Number(t.amount);
          }
          bal = Math.round(bal * 100) / 100;
          if (bal > 0) {
            const cleanMobile = c.mobile.replace(/\D/g, '').slice(-10);
            const msg = `🙏 Namaste ${c.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${bal} hai.\nKripya samay par bhugtan karein.${store?.upiId ? `\n📲 UPI ID: ${store.upiId}` : ''}\n\nDhanyawad! 🙏`;
            dueList.push({
              id: c.id,
              name: c.name,
              mobile: c.mobile,
              balance: bal,
              whatsappUrl: `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`,
              reminderMsg: msg,
            });
          }
        }
        dueList.sort((a, b) => b.balance - a.balance);

        return NextResponse.json({
          type: 'CREDIT_SUMMARY',
          reply: `📱 **बकायेदार ग्राहक और 1-Click WhatsApp रिमाइंडर**:\n${dueList.length > 0 ? `${dueList.length} ग्राहकों के पास उधार बाकी है:` : 'किसी ग्राहक के पास उधार बाकी नहीं है।'}\n\n*किसी भी ग्राहक के सामने वाले बटन से रिमाइंडर भेजें।*`,
          speechText: dueList.length > 0 ? `${dueList.length} grahakon ke paas udhar baaki hai` : 'Koi udhar baaki nahi hai',
          creditSummary: {
            totalDue: dueList.reduce((acc, curr) => acc + curr.balance, 0),
            dueList: dueList.slice(0, 10),
          },
        });
      }

      // Case C: Give Credit (Udhaar likho) or Receive Payment (Jama)
      const amtMatch = normalized.match(/(?:rupaye|rs|inr|₹|\s|^)(\d+(?:\.\d+)?)(?:\s*(?:rupaye|rs|ka|ki|ke))?/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      let cleanName = normalized
        .replace(/(?:rupaye|rs|inr|₹)?\s*\d+(?:\.\d+)?\s*(?:rupaye|rs)?/gi, ' ')
        .replace(/\b(udhar|udhaar|credit|jama|mila|payment|likho|likh|kar_verb|de\b|diya|chadh|kar|karo|karein|kiya|do|dijiye|ko|ka|ki|ke|ne|se|bhi|diye)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanName) {
        cleanName = rawMessage
          .replace(/[०-९0-9]+(?:\.[०-९0-9]+)?/g, ' ')
          .replace(/उधार|क्रेडिट|जमा|मिला|पेमेंट|लिखो|लिख|कर|करो|करें|किया|दो|दीजिए|को|का|की|के|ने|से|रुपये|रुपया|दिए/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      cleanName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim() || 'Grahak';

      const txType = isPaymentReceived ? 'PAYMENT_RECEIVED' : 'GIVE_CREDIT';

      const existingCustomer = await prisma.customer.findFirst({
        where: {
          storeId: user.storeId,
          name: { contains: cleanName, mode: 'insensitive' },
        },
      });

      const customerDisplayName = existingCustomer?.name || cleanName;
      const customerMobile = existingCustomer?.mobile || '';

      if (amount && amount > 0) {
        const actionLabel = txType === 'GIVE_CREDIT' ? 'उधार (-)' : 'जमा (+)';
        const actionSpeech = txType === 'GIVE_CREDIT' ? 'udhaar' : 'jama';

        return NextResponse.json({
          type: 'CONFIRM_CREDIT_ENTRY',
          reply: `📒 **${customerDisplayName} का खाता एंट्री**:\nक्या आप **₹${amount}** ${actionLabel} दर्ज करना चाहते हैं?`,
          speechText: `${customerDisplayName} ke khate me ₹${amount} ${actionSpeech} darj karein?`,
          creditEntry: {
            customerId: existingCustomer?.id || null,
            customerName: customerDisplayName,
            customerMobile,
            type: txType,
            amount,
            description: txType === 'GIVE_CREDIT' ? 'Udhaar Saaman' : 'Nagar Payment',
          },
        });
      }
    }

    // Fetch all store products
    const products = await prisma.product.findMany({
      where: { storeId: user.storeId },
      include: { category: true },
    });

    if (products.length === 0) {
      return NextResponse.json({
        type: 'TEXT',
        reply: 'स्टोर में अभी कोई सामान नहीं है। कृपया इन्वेंटरी में सामान जोड़ें।',
        speechText: 'Store me abhi koi saman nahi hai',
      });
    }

    // ─── PARSE PRODUCT UPDATES (Buy Price, Sell Price, Stock) ───
    let parsingWork = normalized;
    let purchasePrice: number | null = null;
    let sellingPrice: number | null = null;
    let stock: number | null = null;
    let isStockAdd = false;
    let isStockSub = false;

    // 1. Buy Price / Purchase Price / Khareed Daam
    const buyMatch = parsingWork.match(/(?:buy\s*price|khareed(?:\s*daam)?|purchase(?:\s*cost)?|laagat)\s*(?:se|to|hai|hoga|me|mein|:)?\s*(\d+(?:\.\d+)?)/i);
    if (buyMatch) {
      purchasePrice = parseFloat(buyMatch[1]);
      parsingWork = parsingWork.replace(buyMatch[0], ' ');
    }

    // 2. Stock Mode & Value
    isStockAdd = /\b(add|jod|jodo|badha|badhao|extra|aur|\+)\b/i.test(parsingWork);
    isStockSub = /\b(kam|ghata|ghatao|minus|hata|-)\b/i.test(parsingWork);

    const stockMatch = parsingWork.match(/(?:stock|maal|quantity|qty)\s*(?:se|to|hai|hoga|me|mein|:)?\s*(\d+(?:\.\d+)?)/i)
      || parsingWork.match(/(\d+(?:\.\d+)?)\s*(?:packet|pcs|piece|pkt|bora|bori)\s*(?:stock|add|jod|badha|kam|bada)?/i);
    if (stockMatch) {
      stock = parseFloat(stockMatch[1]);
      parsingWork = parsingWork.replace(stockMatch[0], ' ');
    }

    // 3. Sell Price / Rate / Daam
    const sellMatch = parsingWork.match(/(?:sell\s*price|bikri|rate|selling|mrp|daam|bhav|price)\s*(?:se|to|hai|hoga|me|mein|:)?\s*(\d+(?:\.\d+)?)/i)
      || parsingWork.match(/(\d+(?:\.\d+)?)\s*(?:rupya|rupaye|rs|inr)/i);
    if (sellMatch) {
      sellingPrice = parseFloat(sellMatch[1]);
      parsingWork = parsingWork.replace(sellMatch[0], ' ');
    }

    // If only one bare number exists and no specific keyword caught it:
    // e.g. "Dabur Red 25 kar do"
    const remainingNumbers: number[] = [];
    const numRegex = /\b(\d+(?:\.\d+)?)\b/g;
    let nMatch: RegExpExecArray | null;
    while ((nMatch = numRegex.exec(parsingWork)) !== null) {
      remainingNumbers.push(parseFloat(nMatch[1]));
    }

    if (purchasePrice === null && sellingPrice === null && stock === null && remainingNumbers.length > 0) {
      // Default single number is selling price
      sellingPrice = remainingNumbers[remainingNumbers.length - 1];
    }

    // ─── QUERY CLEANING FOR PRODUCT MATCHING ───
    const stopWords = [
      'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'wale', 'wali', 'wala',
      'rate', 'price', 'daam', 'bhav', 'rupya', 'rupaye', 'rupay', 'rs', 'inr', 'rup',
      'kar', 'karo', 'kardo', 'kar_verb', 'karna', 'kariye', 'kijiye', 'hai', 'tha', 'hoga',
      'set', 'update', 'change', 'badal', 'badlo', 'badal_verb',
      'stock', 'add', 'jod', 'jodo', 'badha', 'badhao', 'kam', 'ghata', 'ghatao',
      'piece', 'pieces', 'pcs', 'packet', 'packets', 'pkt', 'kg', 'kilo', 'gm', 'gram', 'ml', 'litre', 'liter',
      'khareed', 'purchase', 'cost', 'new', 'naya', 'purana', 'batao', 'karwake', 'kya', 'kitna', 'kitni', 'details',
      ...DevanagariStopWords,
    ];

    let cleanQuery = normalized;
    cleanQuery = cleanQuery.replace(/\b\d+(?:\.\d+)?\b/g, ' ');
    for (const sw of stopWords) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${sw}\\b|(?<=\\s|^)${sw}(?=\\s|$)`, 'giu'), ' ');
    }
    for (const [w, repl] of Object.entries(HindiDevaWordMap)) {
      cleanQuery = cleanQuery.replace(new RegExp(w, 'gu'), repl);
    }
    cleanQuery = cleanQuery.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ');
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

    // ─── PRODUCT SEARCH & SCORING ───
    const queryTokens = cleanQuery.split(' ').filter((t: string) => t.length >= 2);

    const scoredProducts = products.map((p) => {
      const pName = p.name.toLowerCase();
      let score = 0;

      if (cleanQuery && pName === cleanQuery) score += 250;
      else if (cleanQuery && pName.startsWith(cleanQuery)) score += 120;
      else if (cleanQuery && pName.includes(cleanQuery)) score += 70;

      for (const token of queryTokens) {
        if (pName.split(/\s+/).includes(token)) score += 45;
        else if (pName.includes(token)) score += 25;
        else if (HindiSynonyms[token] && pName.includes(HindiSynonyms[token])) score += 35;
      }

      if (p.category && cleanQuery.includes(p.category.name.toLowerCase())) score += 15;
      if (cleanQuery) score -= Math.abs(pName.length - cleanQuery.length) * 0.4;

      return { product: p, score };
    });

    const isExplicitCreate = /\b(naya\s*product|naya\s*saman|naya\s*item|add\s*product|create\s*product|naya\s*maal|add\s*karo)\b/i.test(normalized)
      || /नया सामान|नया प्रोडक्ट|नया आइटम|नया माल|नया जोड़ो/i.test(rawMessage);

    const bestScore = scoredProducts.length > 0 ? scoredProducts[0].score : 0;
    const topMatch = !isExplicitCreate && bestScore >= 40 ? scoredProducts[0].product : null;
    const alternatives = scoredProducts
      .filter((s) => s.product.id !== topMatch?.id && s.score >= 20)
      .slice(0, 3)
      .map((s) => ({
        id: s.product.id,
        name: s.product.name,
        sellingPrice: parseFloat(s.product.sellingPrice.toString()),
        purchasePrice: parseFloat(s.product.purchasePrice.toString()),
        stock: parseFloat(s.product.stock.toString()),
        unit: s.product.unit,
        category: s.product.category?.name || 'General',
      }));

    // If user is just asking product details (no numbers mentioned):
    const isInfoQuery = /\b(kya\s*hai|kitna\s*hai|kitni\s*hai|batao|rate\s*batao|stock\s*batao|details)\b/i.test(normalized)
      || /क्या है|कितना है|कितनी है|बताओ|डिटेल/i.test(rawMessage);

    if (topMatch && (isInfoQuery || (purchasePrice === null && sellingPrice === null && stock === null))) {
      const curSell = parseFloat(topMatch.sellingPrice.toString());
      const curBuy = parseFloat(topMatch.purchasePrice.toString());
      const curStk = parseFloat(topMatch.stock.toString());

      const reply = `📦 **${topMatch.name}**:\n• **विक्रय दर (Selling Price)**: ₹${curSell}\n• **खरीद मूल्य (Buy Price)**: ₹${curBuy}\n• **उपलब्ध स्टॉक (Stock)**: ${curStk} ${topMatch.unit}\n\n*बदलने के लिए कहें: "खरीद daam 18 aur rate 22 kar do"*`;
      const speechText = `${topMatch.name} ka rate ₹${curSell}, buy price ₹${curBuy}, aur stock ${curStk} ${topMatch.unit} hai`;

      return NextResponse.json({
        type: 'PRODUCT_INFO',
        reply,
        speechText,
        product: {
          id: topMatch.id,
          name: topMatch.name,
          sellingPrice: curSell,
          purchasePrice: curBuy,
          stock: curStk,
          unit: topMatch.unit,
          category: topMatch.category?.name || 'General',
        },
        alternatives,
      });
    }

    // ─── IF INTENDED FOR UPDATE ───
    if (topMatch && (purchasePrice !== null || sellingPrice !== null || stock !== null)) {
      const curSell = parseFloat(topMatch.sellingPrice.toString());
      const curBuy = parseFloat(topMatch.purchasePrice.toString());
      const curStk = parseFloat(topMatch.stock.toString());

      const proposedUpdates: {
        sellingPrice?: { old: number; new: number };
        purchasePrice?: { old: number; new: number };
        stock?: { old: number; new: number };
      } = {};

      const summaryParts: string[] = [];

      if (sellingPrice !== null) {
        proposedUpdates.sellingPrice = { old: curSell, new: sellingPrice };
        summaryParts.push(`विक्रय दर: ₹${curSell} ➔ ₹${sellingPrice}`);
      }

      if (purchasePrice !== null) {
        proposedUpdates.purchasePrice = { old: curBuy, new: purchasePrice };
        summaryParts.push(`खरीद मूल्य: ₹${curBuy} ➔ ₹${purchasePrice}`);
      }

      if (stock !== null) {
        let finalStock = stock;
        if (isStockAdd) finalStock = curStk + stock;
        else if (isStockSub) finalStock = Math.max(0, curStk - stock);
        proposedUpdates.stock = { old: curStk, new: finalStock };
        summaryParts.push(`स्टॉक: ${curStk} ➔ ${finalStock} ${topMatch.unit}`);
      }

      const reply = `📝 **${topMatch.name}** के नए बदलाव तैयार हैं:\n${summaryParts.map((s) => `• ${s}`).join('\n')}\n\nकृपया नीचे कार्ड में चेक करें और **"हाँ, पक्का करो"** दबाएं:`;
      const speechText = `${topMatch.name} ke naye daam check karein aur confirm karein`;

      return NextResponse.json({
        type: 'CONFIRM_UPDATE',
        reply,
        speechText,
        product: {
          id: topMatch.id,
          name: topMatch.name,
          sellingPrice: curSell,
          purchasePrice: curBuy,
          stock: curStk,
          unit: topMatch.unit,
          category: topMatch.category?.name || 'General',
        },
        proposedUpdates,
        alternatives,
      });
    }

    // ─── IF NO EXISTING PRODUCT MATCHED: PROPOSE NEW PRODUCT CREATION ───
    // If numbers are present or explicit create was requested
    if ((sellingPrice !== null || purchasePrice !== null || stock !== null || isExplicitCreate) && cleanQuery.length >= 2) {
      // Capitalize product name nicely
      const cleanName = cleanQuery
        .replace(/\b(naya|saman|product|item|add|karo|batao|daalo|jodo|bikri|khareed|rate|price|stock)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const finalName = cleanName || 'Naya Item';

      // Detect best category
      const categories = await prisma.category.findMany({ where: { storeId: user.storeId } });
      let matchedCategory = categories.find((c) => c.name.toLowerCase() === 'general') || categories[0];

      const lowerName = finalName.toLowerCase();
      for (const cat of categories) {
        if (lowerName.includes(cat.name.toLowerCase())) {
          matchedCategory = cat;
          break;
        }
      }

      // Keyword based category fallbacks
      if (matchedCategory.name.toLowerCase() === 'general') {
        if (/\b(chips|wafers|kurkure|namkeen|biscuit|snack)\b/i.test(lowerName)) {
          const snackCat = categories.find((c) => /snack/i.test(c.name));
          if (snackCat) matchedCategory = snackCat;
        } else if (/\b(oil|tel|ghee|mustard|refined)\b/i.test(lowerName)) {
          const oilCat = categories.find((c) => /oil|ghee/i.test(c.name));
          if (oilCat) matchedCategory = oilCat;
        } else if (/\b(soap|sabun|bath)\b/i.test(lowerName)) {
          const soapCat = categories.find((c) => /soap/i.test(c.name));
          if (soapCat) matchedCategory = soapCat;
        }
      }

      // Detect unit: kg, pcs, packet, l
      let detectedUnit = 'pcs';
      if (/\b(kg|kilo)\b/i.test(normalized)) detectedUnit = 'kg';
      else if (/\b(packet|pkt)\b/i.test(normalized)) detectedUnit = 'packet';
      else if (/\b(litre|liter|l)\b/i.test(normalized)) detectedUnit = 'l';
      else if (/\b(gm|gram)\b/i.test(normalized)) detectedUnit = 'gm';

      const finalSell = sellingPrice !== null ? sellingPrice : 0;
      const finalBuy = purchasePrice !== null ? purchasePrice : 0;
      const finalStock = stock !== null ? stock : 0;

      const reply = `🆕 **'${finalName}'** आपकी दुकान में नहीं मिला। नया सामान जोड़ने का कार्ड तैयार है:\n• **बिक्री रेट (Sell Price)**: ₹${finalSell}\n• **खरीद मूल्य (Buy Price)**: ₹${finalBuy}\n• **शुरुआती स्टॉक**: ${finalStock} ${detectedUnit}\n• **कैटेगरी**: ${matchedCategory?.name || 'General'}\n\nकृपया नीचे कार्ड में चेक करके **"➕ नया सामान जोड़ो"** दबाएं:`;
      const speechText = `${finalName} naya saman jodna chahte hain? Confirm karein.`;

      return NextResponse.json({
        type: 'CREATE_NEW_PRODUCT',
        reply,
        speechText,
        newProduct: {
          name: finalName,
          sellingPrice: finalSell,
          purchasePrice: finalBuy,
          stock: finalStock,
          unit: detectedUnit,
          categoryId: matchedCategory?.id || null,
          categoryName: matchedCategory?.name || 'General',
        },
      });
    }

    // If completely unmatched with no numbers
    return NextResponse.json({
      type: 'TEXT',
      reply: `माफ़ कीजिये, "${cleanQuery || rawMessage}" नाम का सामान नहीं मिला।\n\nअगर यह नया सामान है, तो ऐसे बोलें:\n👉 *"नया आइटम जोड़ो: ${cleanQuery || 'सामान'} खरीद 10 बिक्री 12 स्टॉक 20"*`,
      speechText: `Saman nahi mila. Naya item jodna ho toh rate aur stock ke saath bolein.`,
    });
  } catch (error: any) {
    console.error('Chat AI error:', error);
    return NextResponse.json(
      { type: 'ERROR', reply: error.message || 'AI Assistant me samasya aayi.' },
      { status: 500 },
    );
  }
}
