'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { ShoppingBag, ArrowRight, CheckCircle2, Store, Activity, Box } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Auth context should redirect, but we can safely let it handle it
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const features = [
    { icon: <Store className="w-5 h-5" />, title: 'Smart POS Billing', desc: 'Lightning fast checkout for retail' },
    { icon: <Box className="w-5 h-5" />, title: 'Inventory Management', desc: 'Track stock, set low-stock alerts' },
    { icon: <Activity className="w-5 h-5" />, title: 'Advanced Analytics', desc: 'Know your top sellers & dead stock' },
  ];

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* LEFT SIDE - Brand / Graphic (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-emerald-900 text-white">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500 blur-[120px] opacity-40 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-600 blur-[150px] opacity-50 mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div>
            <Logo size="xl" dark />
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="mt-12 text-5xl font-black leading-[1.1] tracking-tight"
            >
              The Operating System <br/>
              <span className="text-emerald-300">for modern retail.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.4 }}
              className="mt-6 text-emerald-100/80 text-lg max-w-md font-medium leading-relaxed"
            >
              KiranaOS gives you everything you need to manage your inventory, process bills, and analyze sales from a single, beautifully designed dashboard.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            {features.map((feat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-emerald-300 shadow-xl">
                  {feat.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{feat.title}</h3>
                  <p className="text-sm font-medium text-emerald-200/70">{feat.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative">
        {/* Subtle decorative background for right side */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-50/50 blur-[100px] pointer-events-none z-0"></div>

        <div className="w-full max-w-md relative z-10">
          
          <div className="lg:hidden mb-10 text-center">
             <Logo size="xl" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Welcome back</h2>
            <p className="text-gray-500 font-medium">Enter your credentials to access your store.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                {error}
              </motion.div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 block px-5 py-4 font-semibold transition-all hover:bg-gray-50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 block px-5 py-4 font-semibold transition-all hover:bg-gray-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-4 focus:ring-gray-900/20 disabled:opacity-70 shadow-xl shadow-gray-900/10 transition-all active:scale-[0.98] overflow-hidden"
            >
              {/* Subtle shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold text-gray-500">
              Don't have a store account?{' '}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-emerald-600/30 hover:after:bg-emerald-600 after:transition-colors">
                Create one for free
              </Link>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
