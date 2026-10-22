import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

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
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhah: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnees: 19,
  bees: 20,
  ikees: 21,
  baees: 22,
  teis: 23,
  chaubees: 24,
  pachis: 25,
  pachees: 25,
  chhabis: 26,
  sattais: 27,
  atthaees: 28,
  untees: 29,
  tees: 30,
  iktees: 31,
  battees: 32,
  tentis: 33,
  chautis: 34,
  paintis: 35,
  chhattis: 36,
  saintis: 37,
  adhtis: 38,
  untalis: 39,
  chalis: 40,
  paintalis: 45,
  pachaas: 50,
  pachas: 50,
  pachpan: 55,
  saath: 60,
  sath: 60,
  painsath: 65,
  sattar: 70,
  pachhattar: 75,
  assi: 80,
  pachasi: 85,
  nabbe: 90,
  panchanve: 95,
  sau: 100,
  'dedh sau': 150,
  'do sau': 200,
  'dhai sau': 250,
  'paanch sau': 500,
  // Devanagari words
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  तेरह: 13,
  चौदह: 14,
  पंद्रह: 15,
  सोलह: 16,
  सत्रह: 17,
  अठारह: 18,
  उन्नीस: 19,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  पैंतीस: 35,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
  सौ: 100,
};

const DevanagariDigits: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const rawText = (body.text || '').trim();

    if (!rawText) {
      return NextResponse.json(
        { success: false, message: 'Koi aawaz ya text nahi mila (No input text)' },
        { status: 400 },
      );
    }

    // Fetch store products for matching
    const products = await prisma.product.findMany({
      where: { storeId: user.storeId },
      include: { category: true },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Store me koi product nahi mila.' },
        { status: 404 },
      );
    }

    // 1. Normalize Devanagari digits to 0-9
    let normalized = rawText.toLowerCase();
    for (const [d, v] of Object.entries(DevanagariDigits)) {
      normalized = normalized.replaceAll(d, v);
    }

    // 2. Protect Hindi verb phrases so "do" (verb) is not mistaken for number 2
    normalized = normalized.replace(/\b(kar|de|badha|ghata|jod|hata|karo|badhao|ghatao)\s+(do|dijiye|de)\b/gi, '$1_verb');

    // 3. Replace known Hindi number words with digits
    // Sort descending by length so "dedh sau" replaces before "sau"
    const sortedWords = Object.keys(HindiNumberWords).sort((a, b) => b.length - a.length);
    for (const word of sortedWords) {
      const reg = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(reg, String(HindiNumberWords[word]));
    }

    // 4. Intent detection: Selling Price, Purchase Price, or Stock
    const isPurchase = /\b(khareed|purchase|cost|laagat|buying)\b/i.test(normalized);
    const hasPriceWord = /\b(rate|price|bhav|daam|rupya|rupaye|rupay|rs|inr|rup)\b/i.test(normalized);
    const isStock = /\b(stock|maal|qunatity|qty|piece|pieces|pcs|packet|packets|pkt|bora|bori|dibba|packet|add|jod|badha|kam|bada)\b/i.test(normalized) && !hasPriceWord;

    const isAdd = /\b(add|jod|jodo|badha|badhao|extra|aur|plus|\+)\b/i.test(normalized);
    const isSub = /\b(kam|ghata|ghatao|minus|hata|hatao|-)\b/i.test(normalized);

    // 5. Extract numbers
    const numbers: number[] = [];
    const numRegex = /\b(\d+(?:\.\d+)?)\b/g;
    let match: RegExpExecArray | null;
    while ((match = numRegex.exec(normalized)) !== null) {
      numbers.push(parseFloat(match[1]));
    }

    let targetValue: number | null = null;
    let oldValueMentioned: number | null = null;

    if (numbers.length === 1) {
      targetValue = numbers[0];
    } else if (numbers.length >= 2) {
      // Check if "X se Y" pattern exists
      const seMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:se|to|->)\s*(\d+(?:\.\d+)?)/i);
      if (seMatch) {
        oldValueMentioned = parseFloat(seMatch[1]);
        targetValue = parseFloat(seMatch[2]);
      } else {
        // usually the last number is the new target
        targetValue = numbers[numbers.length - 1];
        oldValueMentioned = numbers[0];
      }
    }

    // 6. Extract product search query
    const stopWords = [
      'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'wale', 'wali', 'wala',
      'rate', 'price', 'daam', 'bhav', 'rupya', 'rupaye', 'rupay', 'rs', 'inr', 'rup',
      'kar', 'karo', 'kardo', 'kar_verb', 'karna', 'kariye', 'kijiye', 'hai', 'tha', 'hoga',
      'set', 'update', 'change', 'badal', 'badlo', 'badal_verb',
      'stock', 'add', 'jod', 'jodo', 'badha', 'badhao', 'kam', 'ghata', 'ghatao',
      'piece', 'pieces', 'pcs', 'packet', 'packets', 'pkt', 'kg', 'kilo', 'gm', 'gram', 'ml', 'litre', 'liter',
      'khareed', 'purchase', 'cost', 'new', 'naya', 'purana', 'batao', 'karwake',
      // Devanagari stop words
      'का', 'की', 'के', 'को', 'से', 'में', 'पर', 'वाले', 'वाली', 'वाला',
      'रेट', 'दाम', 'भाव', 'रुपया', 'रुपये', 'रुपय', 'रुपए', 'कर', 'दो', 'करो',
      'दीजिए', 'करना', 'है', 'था', 'होगी', 'होगा', 'स्टॉक', 'ऐड', 'जोड़', 'जोड़ो',
      'बढ़ा', 'बढ़ाओ', 'कम', 'घटा', 'घटाओ', 'पैकेट', 'पीस', 'किलो', 'ग्राम', 'लीटर',
      'नया', 'पुराना', 'खरीद', 'लागत'
    ];

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

    let cleanQuery = normalized;
    // Remove numbers
    cleanQuery = cleanQuery.replace(/\b\d+(?:\.\d+)?\b/g, ' ');
    // Remove stop words
    for (const sw of stopWords) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${sw}\\b|(?<=\\s|^)${sw}(?=\\s|$)`, 'giu'), ' ');
    }
    // Replace Devanagari brand/product terms with English equivalents
    for (const [w, repl] of Object.entries(HindiDevaWordMap)) {
      cleanQuery = cleanQuery.replace(new RegExp(w, 'gu'), repl);
    }
    cleanQuery = cleanQuery.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ');
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

    // 7. Score products
    const queryTokens = cleanQuery.split(' ').filter((t: string) => t.length >= 2);

    const scoredProducts = products.map((p) => {
      const pName = p.name.toLowerCase();
      let score = 0;

      // Exact match
      if (cleanQuery && pName === cleanQuery) {
        score += 250;
      } else if (cleanQuery && pName.startsWith(cleanQuery)) {
        score += 120;
      } else if (cleanQuery && pName.includes(cleanQuery)) {
        score += 70;
      }

      // Token match
      for (const token of queryTokens) {
        if (pName.split(/\s+/).includes(token)) {
          score += 45;
        } else if (pName.includes(token)) {
          score += 25;
        } else if (HindiSynonyms[token] && pName.includes(HindiSynonyms[token])) {
          score += 35;
        }
      }

      // Category match bonus
      if (p.category && cleanQuery.includes(p.category.name.toLowerCase())) {
        score += 15;
      }

      // Barcode match if query is numeric
      if (p.barcode && numbers.length > 0 && p.barcode.includes(String(numbers[0]))) {
        score += 100;
      }

      // Length penalty
      if (cleanQuery) {
        score -= Math.abs(pName.length - cleanQuery.length) * 0.4;
      }

      return { product: p, score };
    });

    scoredProducts.sort((a, b) => b.score - a.score);

    const topMatch = scoredProducts.length > 0 && scoredProducts[0].score > 10 ? scoredProducts[0].product : null;
    const alternatives = scoredProducts
      .filter((s) => s.product.id !== topMatch?.id && s.score > 10)
      .slice(0, 4)
      .map((s) => ({
        id: s.product.id,
        name: s.product.name,
        sellingPrice: parseFloat(s.product.sellingPrice.toString()),
        purchasePrice: parseFloat(s.product.purchasePrice.toString()),
        stock: parseFloat(s.product.stock.toString()),
        unit: s.product.unit,
        category: s.product.category?.name || 'General',
      }));

    if (!topMatch) {
      return NextResponse.json({
        success: false,
        message: `Product pehchan me nahi aaya ("${cleanQuery || rawText}"). Kripya product ka naam saaf bolein.`,
        query: cleanQuery,
        rawText,
      });
    }

    if (targetValue === null) {
      return NextResponse.json({
        success: false,
        message: `Product mil gaya (${topMatch.name}), lekin naya rate ya stock number samajh nahi aaya. Kripya number ke saath bolein (Jaise: "${topMatch.name} 30 kar do").`,
        matchedProduct: {
          id: topMatch.id,
          name: topMatch.name,
          sellingPrice: parseFloat(topMatch.sellingPrice.toString()),
          purchasePrice: parseFloat(topMatch.purchasePrice.toString()),
          stock: parseFloat(topMatch.stock.toString()),
          unit: topMatch.unit,
        },
        rawText,
      });
    }

    // Determine field and final values
    let field: 'sellingPrice' | 'purchasePrice' | 'stock' = 'sellingPrice';
    if (isPurchase) {
      field = 'purchasePrice';
    } else if (isStock) {
      field = 'stock';
    }

    const curSelling = parseFloat(topMatch.sellingPrice.toString());
    const curPurchase = parseFloat(topMatch.purchasePrice.toString());
    const curStock = parseFloat(topMatch.stock.toString());

    let oldVal = curSelling;
    let newVal = targetValue;
    let stockMode: 'set' | 'add' | 'subtract' = 'set';

    if (field === 'purchasePrice') {
      oldVal = curPurchase;
      newVal = targetValue;
    } else if (field === 'stock') {
      oldVal = curStock;
      if (isAdd) {
        stockMode = 'add';
        newVal = curStock + targetValue;
      } else if (isSub) {
        stockMode = 'subtract';
        newVal = Math.max(0, curStock - targetValue);
      } else {
        stockMode = 'set';
        newVal = targetValue;
      }
    }

    const delta = newVal - oldVal;

    // Generate Hindi & English Confirmation Summaries
    let hindiSummary = '';
    let englishSummary = '';
    let speechFeedback = '';

    if (field === 'sellingPrice') {
      hindiSummary = `${topMatch.name}: रेट ₹${oldVal} से बदलकर ₹${newVal} होगा`;
      englishSummary = `${topMatch.name}: Price change from ₹${oldVal} to ₹${newVal}`;
      speechFeedback = `${topMatch.name} ka naya rate ${newVal} rupaye set ho gaya`;
    } else if (field === 'purchasePrice') {
      hindiSummary = `${topMatch.name}: खरीद दाम ₹${oldVal} से बदलकर ₹${newVal} होगा`;
      englishSummary = `${topMatch.name}: Purchase cost change from ₹${oldVal} to ₹${newVal}`;
      speechFeedback = `${topMatch.name} ka purchase price ${newVal} rupaye set ho gaya`;
    } else {
      if (stockMode === 'add') {
        hindiSummary = `${topMatch.name}: स्टॉक ${targetValue} ${topMatch.unit} बढ़ेगा (कुल: ${newVal} ${topMatch.unit})`;
        englishSummary = `${topMatch.name}: Add +${targetValue} ${topMatch.unit} stock (Total: ${newVal})`;
        speechFeedback = `${topMatch.name} me ${targetValue} ${topMatch.unit} stock jod diya gaya`;
      } else if (stockMode === 'subtract') {
        hindiSummary = `${topMatch.name}: स्टॉक ${targetValue} ${topMatch.unit} कम होगा (कुल: ${newVal} ${topMatch.unit})`;
        englishSummary = `${topMatch.name}: Reduce -${targetValue} ${topMatch.unit} stock (Total: ${newVal})`;
        speechFeedback = `${topMatch.name} ka stock ${newVal} ${topMatch.unit} ho gaya`;
      } else {
        hindiSummary = `${topMatch.name}: स्टॉक बदलकर ${newVal} ${topMatch.unit} होगा`;
        englishSummary = `${topMatch.name}: Set stock to ${newVal} ${topMatch.unit}`;
        speechFeedback = `${topMatch.name} ka stock ${newVal} ${topMatch.unit} set ho gaya`;
      }
    }

    return NextResponse.json({
      success: true,
      rawText,
      cleanQuery,
      matchedProduct: {
        id: topMatch.id,
        name: topMatch.name,
        sellingPrice: curSelling,
        purchasePrice: curPurchase,
        stock: curStock,
        unit: topMatch.unit,
        category: topMatch.category?.name || 'General',
        image: topMatch.image,
      },
      change: {
        field,
        oldValue: oldVal,
        newValue: newVal,
        delta,
        stockMode: field === 'stock' ? stockMode : undefined,
      },
      hindiSummary,
      englishSummary,
      speechFeedback,
      alternatives,
    });
  } catch (error: any) {
    console.error('Voice parse error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Voice parsing failed' },
      { status: 500 },
    );
  }
}
