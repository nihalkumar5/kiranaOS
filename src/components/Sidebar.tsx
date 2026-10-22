'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Zap,
  Boxes,
  BookOpen,
  BarChart2,
  Globe,
  Settings,
  Sparkles,
  Command,
  Store,
  ChevronRight,
  LogOut,
  X,
  Keyboard
} from 'lucide-react';
import Logo from '@/components/Logo';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, store, logout } = useAuth();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const menuItems = [
    { icon: <LayoutDashboard className="w-[18px] h-[18px]" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Zap className="w-[18px] h-[18px]" />, label: 'POS Billing', path: '/pos', badge: 'FAST' },
    { icon: <BookOpen className="w-[18px] h-[18px]" />, label: 'Udhaar Khata', path: '/credit', badgeColor: 'bg-amber-100 text-amber-800' },
    { icon: <Boxes className="w-[18px] h-[18px]" />, label: 'Inventory', path: '/inventory' },
    { icon: <BarChart2 className="w-[18px] h-[18px]" />, label: 'Reports', path: '/reports' },
    { icon: <Globe className="w-[18px] h-[18px]" />, label: 'Online Store', path: '/storefront-builder' },
    { icon: <Settings className="w-[18px] h-[18px]" />, label: 'Settings', path: '/settings' },
  ];

  const shortcuts = [
    { key: 'F2', desc: 'Barcode / Item Search Focus' },
    { key: 'F4', desc: 'Customer Mobile Lookup' },
    { key: 'F8', desc: 'Hold / Park Active Cart' },
    { key: 'F9', desc: 'Quick Pay (Cash)' },
    { key: 'F10', desc: 'Quick Pay (UPI QR)' },
    { key: 'Esc', desc: 'Clear Current Cart' },
    { key: 'Space', desc: 'Hold to Speak (Voice AI)' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0 sticky top-0 bg-white border-r border-slate-200/90 shadow-[1px_0_12px_rgba(0,0,0,0.02)] h-screen w-[260px] p-4 justify-between z-30 select-none">
        {/* Top: Logo & Store Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <Logo size="md" />
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PRO POS
            </span>
          </div>

          {/* Active Store Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black text-slate-900 truncate m-0">
                {store?.name || 'Kirana Supermart'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  Counter Active
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 mt-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150 text-left border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'text-slate-600 border-transparent hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Voice Assistant Banner, Shortcuts & User Card */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          {/* Quick Voice Prompt Trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('kirana_toggle_voice'));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-sm hover:opacity-95 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Bol Kar Kaam Karein</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Shortcuts Trigger */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">?</span>
          </button>

          {/* User Profile / Logout */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate m-0 leading-tight">
                  {user?.name || 'Admin Cashier'}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tight m-0">
                  {user?.role || 'ADMIN'}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] flex items-center justify-around px-2 py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-emerald-700 -translate-y-1' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-2 rounded-xl ${isActive ? 'bg-emerald-100 shadow-sm border border-emerald-200/60' : 'p-1.5'}`}>
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                  className: isActive ? 'w-5 h-5 stroke-[2.5px]' : 'w-5 h-5',
                })}
              </div>
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-black' : 'font-semibold'}`}>
                {item.label.replace('Online Store', 'Store').replace('POS Billing', 'POS').replace('Udhaar Khata', 'Khata')}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900 m-0">POS Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {shortcuts.map((sc) => (
                <div key={sc.key} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono font-black text-slate-900 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 font-medium m-0">
                Press any function key anytime in POS for instant lightning speed.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
