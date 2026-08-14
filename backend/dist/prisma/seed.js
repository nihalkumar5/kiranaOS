"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding database...');
    await prisma.onlineOrderItem.deleteMany({});
    await prisma.onlineOrder.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.store.deleteMany({});
    console.log('Cleared existing database records.');
    const store = await prisma.store.create({
        data: {
            name: 'Mittal Kirana Store',
            phone: '9876543210',
            address: 'Shop No. 12, Sector 15, Dwarka, New Delhi',
            gstin: '07AAAAA1111A1Z1',
        },
    });
    console.log(`Created store: ${store.name}`);
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
        data: {
            name: 'Rakesh Mittal',
            email: 'admin@kirana.com',
            passwordHash,
            role: client_1.Role.ADMIN,
            storeId: store.id,
        },
    });
    const staff = await prisma.user.create({
        data: {
            name: 'Sunil Kumar',
            email: 'staff@kirana.com',
            passwordHash,
            role: client_1.Role.STAFF,
            storeId: store.id,
        },
    });
    console.log(`Created users: Admin (${admin.email}), Staff (${staff.email})`);
    const groceries = await prisma.category.create({
        data: { name: 'Groceries', storeId: store.id },
    });
    const beverages = await prisma.category.create({
        data: { name: 'Beverages', storeId: store.id },
    });
    const dairy = await prisma.category.create({
        data: { name: 'Dairy', storeId: store.id },
    });
    const snacks = await prisma.category.create({
        data: { name: 'Snacks', storeId: store.id },
    });
    console.log('Created categories: Groceries, Beverages, Dairy, Snacks');
    const products = [
        {
            barcode: '8901234567890',
            name: 'Tata Salt 1kg',
            categoryId: groceries.id,
            purchasePrice: 24.0,
            sellingPrice: 28.0,
            stock: 100,
            unit: 'packet',
            brand: 'Tata',
            gst: 0.0,
            image: 'https://images.unsplash.com/photo-1627484745814-c10ba4fc402a?w=400&h=400&fit=crop',
        },
        {
            barcode: '8901111222233',
            name: 'Sugar (Chini) Premium',
            categoryId: groceries.id,
            purchasePrice: 38.0,
            sellingPrice: 42.0,
            stock: 150.5,
            unit: 'kg',
            brand: 'Local',
            gst: 5.0,
            image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&h=400&fit=crop',
        },
        {
            barcode: '8904444555566',
            name: 'Fortune Mustard Oil 1L',
            categoryId: groceries.id,
            purchasePrice: 155.0,
            sellingPrice: 170.0,
            stock: 45,
            unit: 'bottle',
            brand: 'Fortune',
            gst: 5.0,
            image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
        },
        {
            barcode: '8901765432109',
            name: 'Coca-Cola 500ml',
            categoryId: beverages.id,
            purchasePrice: 34.0,
            sellingPrice: 40.0,
            stock: 80,
            unit: 'bottle',
            brand: 'Coca-Cola',
            gst: 18.0,
            image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
        },
        {
            barcode: '8901262010023',
            name: 'Amul Butter 100g',
            categoryId: dairy.id,
            purchasePrice: 50.0,
            sellingPrice: 56.0,
            stock: 60,
            unit: 'pcs',
            brand: 'Amul',
            gst: 12.0,
            image: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&h=400&fit=crop',
        },
        {
            barcode: '8901030661111',
            name: 'Mother Dairy Full Cream Milk 1L',
            categoryId: dairy.id,
            purchasePrice: 60.0,
            sellingPrice: 66.0,
            stock: 40,
            unit: 'pcs',
            brand: 'Mother Dairy',
            gst: 0.0,
            image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
        },
        {
            barcode: '8902080001017',
            name: 'Lay\'s Classic 50g',
            categoryId: snacks.id,
            purchasePrice: 17.0,
            sellingPrice: 20.0,
            stock: 120,
            unit: 'packet',
            brand: 'Lays',
            gst: 18.0,
            image: 'https://images.unsplash.com/photo-1566478989037-e924e50cb0ee?w=400&h=400&fit=crop',
        },
        {
            barcode: '8901058002316',
            name: 'Maggi 2-Min Noodles 70g',
            categoryId: snacks.id,
            purchasePrice: 12.0,
            sellingPrice: 14.0,
            stock: 200,
            unit: 'packet',
            brand: 'Nestle',
            gst: 18.0,
            image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop',
        },
    ];
    for (const p of products) {
        const created = await prisma.product.create({
            data: {
                ...p,
                storeId: store.id,
            },
        });
        await prisma.inventoryTransaction.create({
            data: {
                storeId: store.id,
                productId: created.id,
                userId: admin.id,
                type: 'PURCHASE',
                quantity: p.stock,
                beforeStock: 0,
                afterStock: p.stock,
                description: 'Initial stock seeding',
            },
        });
    }
    console.log(`Successfully seeded ${products.length} products and initial stock.`);
    console.log('Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map