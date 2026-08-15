const fs = require('fs');
const content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

const strCat = `            {!searchQuery && (
              <div className="mb-12">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#059669]" />
                  Shop by Category
                </h2>`;

const idxCat = content.indexOf(strCat);
const strProducts = `            {filteredProducts.length === 0 ? (`;
const idxProducts = content.indexOf(strProducts);

if (idxCat === -1 || idxProducts === -1) {
  console.log("Could not find start indices");
  process.exit(1);
}

const strEnd = `          </div>
        </section>

        {/* Right Side: The Cashier Cart Panel`;

const idxEnd = content.indexOf(strEnd);

const catBlock = content.slice(idxCat, idxProducts);
const productsBlock = content.slice(idxProducts, idxEnd);

// Now construct the new content
const newContent = content.slice(0, idxCat) + productsBlock + "\n\n" + catBlock + content.slice(idxEnd);

fs.writeFileSync('src/app/pos/page.tsx', newContent);
console.log("Successfully swapped!");
