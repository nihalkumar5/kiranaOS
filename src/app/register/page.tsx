'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const { registerStore } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerStore(storeName, name, email, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative blurred background circles */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center">
          <h1><Logo size="xl" dark /></h1>
          <p className="mt-2 text-sm text-slate-400">
            Register your store and create your administrator account
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm transition-all duration-300">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="storeName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Store Name
              </label>
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200 text-sm"
                placeholder="e.g. Verma General Store"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Your Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200 text-sm"
                placeholder="e.g. Ramesh Verma"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200 text-sm"
                placeholder="ramesh@vermastores.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Store'
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-sm text-slate-500">
              Already have a store account?{' '}
              <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
