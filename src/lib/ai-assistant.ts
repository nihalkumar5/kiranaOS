import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getCached, setCached } from '@/lib/cache';

export interface CopilotResponse {
  type:
    | 'TEXT'
    | 'CONFIRM_UPDATE'
    | 'PRODUCT_INFO'
    | 'SALES_INFO'
    | 'LOW_STOCK'
    | 'CREATE_NEW_PRODUCT'
    | 'CONFIRM_CREDIT_ENTRY'
    | 'CREDIT_REMINDER'
    | 'CREDIT_SUMMARY'
    | 'ADD_TO_CART'
    | 'ERROR';
  reply: string;
  speechText: string;
  product?: any;
  proposedUpdates?: {
    sellingPrice?: { old: number; new: number };
    purchasePrice?: { old: number; new: number };
    stock?: { old: number; new: number };
  };
  quantity?: number;
  newProduct?: {
    name: string;
    sellingPrice: number;
    purchasePrice: number;
    stock: number;
    unit: string;
    categoryId?: string | null;
    categoryName?: string;
  };
  creditEntry?: {
    customerId?: string | null;
    customerName: string;
    customerMobile?: string;
    type: 'GIVE_CREDIT' | 'PAYMENT_RECEIVED';
    amount: number;
    description?: string;
  };
  creditSummary?: {
    totalDue: number;
    dueList: Array<{
      id?: string;
      name: string;
      mobile: string;
      balance: number;
      daysPending?: number;
    }>;
  };
  salesData?: {
    totalSales: number;
    billsCount: number;
    cashSales: number;
    upiSales: number;
  };
  items?: Array<{ id: string; name: string; stock: number; unit: string }>;
}

export async function processKiranaCopilotWithGemini(
  rawMessage: string,
  storeId: string,
): Promise<CopilotResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  // 1. Fetch or get cached product catalog (TTL 2 minutes)
  const catalogCacheKey = `products:${storeId}:ai_catalog`;
  let catalog = getCached<any[]>(catalogCacheKey, 120_000);
  if (!catalog) {
    catalog = await prisma.product.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        barcode: true,
        sellingPrice: true,
        purchasePrice: true,
        stock: true,
        unit: true,
        gst: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    setCached(catalogCacheKey, catalog);
  }

  // 2. Fetch categories
  const catCacheKey = `products:${storeId}:categories`;
  let categories = getCached<any[]>(catCacheKey, 300_000);
  if (!categories) {
    categories = await prisma.category.findMany({
      where: { storeId },
      select: { id: true, name: true },
    });
    setCached(catCacheKey, categories);
  }

  // 3. Fetch today's sales metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayOrders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: todayStart, lte: todayEnd },
      status: 'COMPLETED',
    },
    select: { totalAmount: true, paymentMode: true },
  });

  let totalSales = 0;
  let cashSales = 0;
  let upiSales = 0;
  for (const o of todayOrders) {
    const amt = Number(o.totalAmount);
    totalSales += amt;
    if (o.paymentMode === 'CASH') cashSales += amt;
    else if (o.paymentMode === 'UPI') upiSales += amt;
  }

  // 4. Fetch pending khata / credit customers
  const customers = await prisma.customer.findMany({
    where: { storeId },
    include: {
      creditTransactions: {
        select: { type: true, amount: true, createdAt: true },
      },
    },
    take: 40,
  });

  const debtorsWithBalance = customers
    .map((c) => {
      let gave = 0;
      let got = 0;
      let oldestPendingDate = c.updatedAt;
      for (const t of c.creditTransactions) {
        const amt = Number(t.amount);
        if (t.type === 'GIVE_CREDIT') {
          gave += amt;
          oldestPendingDate = t.createdAt;
        } else if (t.type === 'PAYMENT_RECEIVED') {
          got += amt;
        }
      }
      const balance = Math.round((gave - got) * 100) / 100;
      const daysPending = Math.max(
        1,
        Math.floor((Date.now() - new Date(oldestPendingDate).getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        id: c.id,
        name: c.name,
        phone: c.mobile,
        balance,
        daysPending,
      };
    })
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalUdhaar = debtorsWithBalance.reduce((sum, d) => sum + d.balance, 0);

  // 5. Low stock items
  const lowStockProducts = catalog
    .filter((p) => Number(p.stock) <= 5)
    .slice(0, 15)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: Number(p.stock),
      unit: p.unit,
    }));

  // Compact catalog representation for prompt efficiency
  const compactCatalog = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    sp: Number(p.sellingPrice),
    bp: Number(p.purchasePrice),
    st: Number(p.stock),
    u: p.unit,
    cat: p.category?.name || 'General',
    bc: p.barcode || undefined,
  }));

  const compactDebtors = debtorsWithBalance.slice(0, 20);

  const systemInstruction = `You are KiranaOS AI Copilot, the intelligent store manager assistant for an Indian retail Kirana (grocery) shop.
Current Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}.
You understand English, Hindi (Devanagari and Hinglish Roman script), and common retail Kirana terminology.
Your job is to understand what the store owner wants to do, check the store context, and respond in structured JSON format.

STORE REAL-TIME METRICS:
- Today's Sales: ₹${totalSales.toLocaleString('en-IN')} across ${todayOrders.length} bills (Cash: ₹${cashSales.toLocaleString('en-IN')}, UPI: ₹${upiSales.toLocaleString('en-IN')})
- Total Pending Udhaar (Credit): ₹${totalUdhaar.toLocaleString('en-IN')} across ${debtorsWithBalance.length} customers
- Low Stock Items (${lowStockProducts.length} items): ${lowStockProducts.map((p) => `${p.name} (${p.stock} ${p.unit})`).join(', ') || 'None'}
- Available Categories: ${categories.map((c) => c.name).join(', ')}

STORE CUSTOMERS WITH PENDING KHATA:
${JSON.stringify(compactDebtors)}

PRODUCT CATALOG (${compactCatalog.length} items):
${JSON.stringify(compactCatalog)}

INTENT CLASSIFICATION RULES:
1. "CONFIRM_UPDATE": User wants to update selling price, purchase price (cost), or stock of an EXISTING item in the catalog.
   - Return target product id from catalog.
   - Set proposedUpdates with old and new values.
2. "ADD_TO_CART": User wants to add an item to POS bill/cart (e.g., "cart me daal do", "bill me jod do", "2 packet maggi add karo").
   - Find matching product id in catalog.
   - Specify quantity (default 1).
3. "CREATE_NEW_PRODUCT": User wants to add a brand new item not found in catalog, or explicitly says "naya saman jodo / add product".
   - Extract name, sellingPrice, purchasePrice, stock, unit (kg, packet, pcs, l, gm), and categoryName.
4. "CONFIRM_CREDIT_ENTRY": User wants to record credit given (udhaar diya) or payment received (jama kiya / udhaar chukaya).
   - Extract customerName, customerMobile (if mentioned or found from existing customer), type: "GIVE_CREDIT" | "PAYMENT_RECEIVED", amount, and description.
5. "CREDIT_SUMMARY": User asks who owes money, total pending credit, or khata summary.
   - Provide summary in reply with total due and list of customers.
6. "SALES_INFO": User asks about today's sales, revenue, collection, cash vs UPI, or number of orders.
7. "LOW_STOCK": User asks which items have low stock or are running out.
8. "TEXT": General assistant questions, product price lookups ("mustard oil kitne ka hai?"), business advice, inventory queries, store analytics, or greetings.

REPLY & SPEECH GUIDELINES:
- 'reply': Clear, elegant markdown. Use bold highlights and clean bullet points. Keep it professional and helpful.
- 'speechText': Ultra-short (1 sentence, max 10-15 words) for audio speech synthesis.

OUTPUT FORMAT:
Always return strictly valid JSON matching this schema:
{
  "type": "CONFIRM_UPDATE" | "CREATE_NEW_PRODUCT" | "ADD_TO_CART" | "SALES_INFO" | "LOW_STOCK" | "CONFIRM_CREDIT_ENTRY" | "CREDIT_SUMMARY" | "TEXT",
  "reply": string,
  "speechText": string,
  "productId": string | null,
  "proposedUpdates": {
    "sellingPrice"?: { "old": number, "new": number },
    "purchasePrice"?: { "old": number, "new": number },
    "stock"?: { "old": number, "new": number }
  } | null,
  "quantity"?: number | null,
  "newProduct"?: {
    "name": string,
    "sellingPrice": number,
    "purchasePrice": number,
    "stock": number,
    "unit": string,
    "categoryName"?: string
  } | null,
  "creditEntry"?: {
    "customerId"?: string | null,
    "customerName": string,
    "customerMobile"?: string | null,
    "type": "GIVE_CREDIT" | "PAYMENT_RECEIVED",
    "amount": number,
    "description"?: string
  } | null
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `User command / query: "${rawMessage}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    const result: CopilotResponse = {
      type: parsed.type || 'TEXT',
      reply: parsed.reply || 'Request processed.',
      speechText: parsed.speechText || 'OK.',
    };

    // Enrich CONFIRM_UPDATE
    if (parsed.type === 'CONFIRM_UPDATE') {
      const targetProduct = catalog.find((p) => p.id === parsed.productId);
      if (targetProduct) {
        result.product = {
          id: targetProduct.id,
          name: targetProduct.name,
          sellingPrice: Number(targetProduct.sellingPrice),
          purchasePrice: Number(targetProduct.purchasePrice),
          stock: Number(targetProduct.stock),
          unit: targetProduct.unit,
          category: targetProduct.category?.name || 'General',
        };
        result.proposedUpdates = parsed.proposedUpdates || {};
      } else {
        result.type = 'TEXT';
      }
    }

    // Enrich ADD_TO_CART
    if (parsed.type === 'ADD_TO_CART') {
      const targetProduct = catalog.find((p) => p.id === parsed.productId);
      if (targetProduct) {
        result.product = {
          id: targetProduct.id,
          name: targetProduct.name,
          barcode: targetProduct.barcode,
          sellingPrice: Number(targetProduct.sellingPrice),
          purchasePrice: Number(targetProduct.purchasePrice),
          stock: Number(targetProduct.stock),
          unit: targetProduct.unit,
          gst: Number(targetProduct.gst || 0),
        };
        result.quantity = parsed.quantity && parsed.quantity > 0 ? parsed.quantity : 1;
      } else {
        result.type = 'TEXT';
      }
    }

    // Enrich CREATE_NEW_PRODUCT
    if (parsed.type === 'CREATE_NEW_PRODUCT' && parsed.newProduct) {
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === (parsed.newProduct.categoryName || '').toLowerCase(),
      );
      result.newProduct = {
        name: parsed.newProduct.name || 'New Item',
        sellingPrice: Number(parsed.newProduct.sellingPrice || 0),
        purchasePrice: Number(parsed.newProduct.purchasePrice || 0),
        stock: Number(parsed.newProduct.stock || 0),
        unit: parsed.newProduct.unit || 'pcs',
        categoryId: matchedCat?.id || null,
        categoryName: matchedCat?.name || parsed.newProduct.categoryName || 'General',
      };
    }

    // Enrich CONFIRM_CREDIT_ENTRY
    if (parsed.type === 'CONFIRM_CREDIT_ENTRY' && parsed.creditEntry) {
      const matchingDebtor = debtorsWithBalance.find(
        (d) =>
          d.name.toLowerCase().includes(parsed.creditEntry.customerName?.toLowerCase() || '') ||
          (parsed.creditEntry.customerMobile && d.phone === parsed.creditEntry.customerMobile),
      );
      result.creditEntry = {
        customerId: matchingDebtor?.id || parsed.creditEntry.customerId || null,
        customerName: matchingDebtor?.name || parsed.creditEntry.customerName || 'Customer',
        customerMobile: matchingDebtor?.phone || parsed.creditEntry.customerMobile || '',
        type: parsed.creditEntry.type === 'PAYMENT_RECEIVED' ? 'PAYMENT_RECEIVED' : 'GIVE_CREDIT',
        amount: Math.abs(Number(parsed.creditEntry.amount || 0)),
        description: parsed.creditEntry.description || 'Kirana credit record',
      };
    }

    // Enrich CREDIT_SUMMARY
    if (parsed.type === 'CREDIT_SUMMARY') {
      result.creditSummary = {
        totalDue: totalUdhaar,
        dueList: compactDebtors.map((d) => ({
          id: d.id,
          name: d.name,
          mobile: d.phone || '',
          balance: d.balance,
          daysPending: d.daysPending,
        })),
      };
    }

    // Enrich SALES_INFO
    if (parsed.type === 'SALES_INFO') {
      result.salesData = {
        totalSales,
        billsCount: todayOrders.length,
        cashSales,
        upiSales,
      };
    }

    // Enrich LOW_STOCK
    if (parsed.type === 'LOW_STOCK') {
      result.items = lowStockProducts;
    }

    return result;
  } catch (err: any) {
    console.error('Gemini Copilot Error:', err?.message || err);
    return null;
  }
}
