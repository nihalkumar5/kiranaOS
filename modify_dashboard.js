const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

if (!content.includes("from 'framer-motion'")) {
    content = content.replace("import { io } from 'socket.io-client';", "import { io } from 'socket.io-client';\nimport { motion } from 'framer-motion';");
}

const mainReturnIdx = content.indexOf("return (\n    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>");

if (mainReturnIdx === -1) {
    console.error("Could not find main return block!");
    process.exit(1);
}

const endIdx = content.lastIndexOf(');') + 2;

const newReturn = `return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Real-time Order Notification */}
      {orderAlert && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex items-start gap-4 max-w-sm"
        >
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-200">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="font-extrabold text-[13px] text-gray-900 m-0 tracking-wide">NEW ORDER — {orderAlert.paymentMode}</p>
            <p className="text-[12px] text-gray-500 my-1 font-medium">Bill #{orderAlert.billNumber} by {orderAlert.cashier}</p>
            <p className="text-[16px] font-black text-emerald-600 m-0">₹{orderAlert.totalAmount}</p>
          </div>
        </motion.div>
      )}

      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-0 relative">
        
        {/* Dynamic Dark Hero Background */}
        <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-gray-900 via-gray-900 to-gray-50 z-0 overflow-hidden">
          <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
          <div className="absolute top-[100px] left-[-50px] w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
        </div>

        {/* Top Bar */}
        <div className="relative z-10 px-4 md:px-8 pt-8 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-[14px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Welcome back 👋</p>
            <h1 className="text-3xl md:text-4xl font-black text-white m-0 tracking-tight">{store?.name || 'Dashboard'}</h1>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/pos')}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-[14px] px-5 py-2.5 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" /> Open POS
            </button>
            <button
              onClick={() => router.push('/inventory')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold text-[14px] px-5 py-2.5 border border-white/20 transition-all active:scale-95"
            >
              <Boxes className="w-4 h-4" /> Inventory
            </button>
          </motion.div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 p-4 md:px-8 flex flex-col gap-8">
          {loading ? (
            <div className="flex justify-center items-center h-[300px]">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin shadow-lg" />
            </div>
          ) : stats ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((card, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    key={i} 
                    className="bg-white/80 backdrop-blur-xl p-5 md:p-6 border border-white/40 rounded-2xl shadow-xl shadow-gray-200/50 flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-transform"
                  >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-900/20 relative z-10">
                      {card.icon}
                    </div>
                    <div className="relative z-10">
                      <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">{card.label}</p>
                      <p className="text-2xl md:text-3xl font-black text-gray-900 m-0 tracking-tight">{card.value}</p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-100 relative z-10">
                      <p className="text-[12px] font-bold text-emerald-600 m-0">{card.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Category Sales */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex-1 lg:w-2/3 bg-white p-6 border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/40">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                      Category Sales
                    </h3>
                    <span className="text-[12px] text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-full">Today (INR)</span>
                  </div>

                  {stats.categorySales.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-gray-400 text-sm font-medium">No sales recorded yet.</div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {stats.categorySales.map((cat, i) => {
                        const gradients = [
                          'from-blue-500 to-cyan-400',
                          'from-emerald-500 to-teal-400',
                          'from-purple-500 to-pink-400',
                          'from-orange-500 to-yellow-400',
                          'from-indigo-500 to-blue-400'
                        ];
                        const pct = (cat.value / maxCategorySales) * 100;
                        return (
                          <div key={cat.name} className="group">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-[13px] font-bold text-gray-700">{cat.name}</span>
                              <span className="text-[14px] font-black text-gray-900">₹{cat.value.toFixed(0)}</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: \`\${pct}%\` }} 
                                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                className={\`h-full bg-gradient-to-r \${gradients[i % gradients.length]} rounded-full shadow-sm\`} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* Best Sellers */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="w-full lg:w-1/3 bg-white p-6 border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/40">
                  <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Zap className="w-5 h-5" /></div>
                    Top Sellers
                  </h3>
                  <div className="flex flex-col gap-3">
                    {stats.bestSellers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8 font-medium">No data yet.</p>
                    ) : stats.bestSellers.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                        <div className={\`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm \${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : i === 2 ? 'bg-gradient-to-br from-amber-700 to-yellow-900 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-[11px] font-semibold text-gray-500">MRP ₹{Number(item.price).toFixed(0)}</p>
                        </div>
                        <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-[11px] font-black flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          {item.quantitySold} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Bottom Row */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Low Stock Alerts */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="flex-1 lg:w-2/3 bg-white p-6 border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/40">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                      Critical Stock
                      <span className="bg-red-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-red-200 animate-pulse">
                        {stats.lowStock.count} Alerts
                      </span>
                    </h3>
                    <button
                      onClick={() => router.push('/inventory')}
                      className="text-[12px] text-gray-600 font-bold hover:text-gray-900 flex items-center gap-1 transition-colors"
                    >
                      Inventory <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stats.lowStock.items.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-emerald-500 font-bold bg-emerald-50 rounded-2xl border border-emerald-100">
                        ✨ All stock levels are healthy!
                      </div>
                    ) : stats.lowStock.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-red-100 rounded-2xl shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
                        <div>
                          <p className="text-[13px] font-bold text-gray-900 mb-0.5">{item.name}</p>
                          <p className="text-[11px] font-semibold text-red-500">Action Required</p>
                        </div>
                        <span className="font-black text-white bg-gradient-to-r from-red-500 to-rose-500 px-3 py-1.5 text-[12px] rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                          {Number(item.stock).toFixed(1)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* QR Code */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="w-full lg:w-1/3 bg-gradient-to-br from-gray-900 to-black p-6 text-white border border-gray-800 rounded-3xl shadow-2xl shadow-black/40 flex flex-col items-center gap-6 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500 rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>
                  
                  <h3 className="text-lg font-black m-0 flex items-center gap-2 relative z-10 w-full justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" /> Online Catalog
                  </h3>
                  
                  <div className="bg-white p-3 rounded-2xl shadow-xl shadow-emerald-900/20 relative z-10">
                    <img
                      src={\`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=\${encodeURIComponent(\`http://localhost:3001/store/\${store?.id}\`)}\`}
                      alt="Store QR"
                      width={140} height={140}
                      className="block rounded-lg"
                    />
                  </div>
                  
                  <div className="text-center relative z-10">
                    <p className="text-[13px] font-bold text-gray-200 mb-1">Scan to order from mobile</p>
                    <p className="text-[11px] font-medium text-gray-400">Share this with your customers</p>
                  </div>
                  
                  <a
                    href={\`/store/\${store?.id}\`}
                    target="_blank"
                    rel="noreferrer"
                    className="relative z-10 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    Open Storefront <ArrowUpRight className="w-4 h-4" />
                  </a>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-16 font-semibold">Failed to load dashboard metrics.</div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const newContent = content.slice(0, mainReturnIdx) + newReturn;
fs.writeFileSync('src/app/dashboard/page.tsx', newContent);
console.log("Success");
