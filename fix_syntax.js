const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

content = content.replace(`                } else {
                  playErrorSound();
                  setQuickAddBarcode(cleanQuery);
                  setShowQuickAddModal(true);
                }
              if (e.key === 'Escape') {`, `                } else {
                  playErrorSound();
                  setQuickAddBarcode(cleanQuery);
                  setShowQuickAddModal(true);
                }
              } else if (e.key === 'Escape') {`);

fs.writeFileSync('src/app/pos/page.tsx', content);
console.log("Syntax fixed");
