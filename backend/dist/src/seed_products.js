"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const store = await prisma.store.findFirst();
    if (!store) {
        console.error('No store found');
        return;
    }
    const products = [
        { name: 'Kissan Ketchup Pouch', barcode: '8901030921797', brand: 'Kissan', unit: 'packet', purchasePrice: 10, sellingPrice: 15, stock: 50, gst: 18, storeId: store.id },
        { name: 'Red Label Tea', barcode: '8901030876943', brand: 'Brooke Bond', unit: 'packet', purchasePrice: 100, sellingPrice: 120, stock: 30, gst: 5, storeId: store.id },
        { name: 'Baidyanath Amla Juice', barcode: '8906168740739', brand: 'Baidyanath', unit: 'bottle', purchasePrice: 150, sellingPrice: 180, stock: 20, gst: 12, storeId: store.id },
        { name: 'Captain Cook Salt', barcode: '8906170470297', brand: 'Captain Cook', unit: 'packet', purchasePrice: 15, sellingPrice: 20, stock: 100, gst: 0, storeId: store.id }
    ];
    for (const p of products) {
        const existing = await prisma.product.findFirst({
            where: { barcode: p.barcode, storeId: store.id }
        });
        if (!existing) {
            await prisma.product.create({ data: p });
            console.log(`Added ${p.name}`);
        }
        else {
            console.log(`${p.name} already exists`);
        }
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed_products.js.map