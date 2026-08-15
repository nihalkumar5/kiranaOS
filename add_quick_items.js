const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

const strCat = `            {!searchQuery && (
              <div className="mb-12">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#059669]" />
                  Shop by Category
                </h2>`;

// Extract product card template
const templateStart = content.indexOf('                        const isOutOfStock = false;');
const templateEnd = content.indexOf('                          </motion.div>', templateStart) + '                          </motion.div>'.length;
const cardTemplate = content.slice(templateStart, templateEnd);

// Build Quick Items section
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
                  {productsList.slice(0, 10).map((p) => {
${cardTemplate}
                  })}
                </div>
              </div>
            )}
`;

const idxCat = content.indexOf(strCat);

if (idxCat === -1) {
  console.log("Could not find start indices");
  process.exit(1);
}

// Insert before `Shop by Category`
const newContent = content.slice(0, idxCat) + quickItemsSection + content.slice(idxCat);

fs.writeFileSync('src/app/pos/page.tsx', newContent);
console.log("Successfully added Quick Items!");
