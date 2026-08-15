const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

// Find the start of the card template
const startMarker = 'const isOutOfStock = false; // ALLOW NEGATIVE STOCK';
const endMarker = '                          </motion.div>\n                        );\n                      })}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx) + '                          </motion.div>\n                        );'.length;

const cardTemplate = content.slice(startIdx, endIdx);

const quickItemsSection = `
            {!searchQuery && productsList.length > 0 && (
              <div className="mb-12 flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Zap className="w-6 h-6 text-[#059669]" />
                    Quick Items
                  </h2>
                  <button className="text-[#059669] font-bold text-sm hover:underline">see all</button>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide">
                  {productsList.slice(0, 8).map((p) => {
${cardTemplate}
                  })}
                </div>
              </div>
            )}
`;

const insertMarker = `            {!searchQuery && (
              <div className="mb-12">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#059669]" />
                  Shop by Category
                </h2>`;

const insertIdx = content.indexOf(insertMarker);

const newContent = content.slice(0, insertIdx) + quickItemsSection + content.slice(insertIdx);
fs.writeFileSync('src/app/pos/page.tsx', newContent);
console.log("Success");
