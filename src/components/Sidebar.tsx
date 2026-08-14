'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  Boxes,
  BarChart2,
  Globe,
} from 'lucide-react';
import Logo from '@/components/Logo';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Zap className="w-4 h-4" />, label: 'POS Billing', path: '/pos' },
    { icon: <Boxes className="w-4 h-4" />, label: 'Inventory', path: '/inventory' },
    { icon: <BarChart2 className="w-4 h-4" />, label: 'Reports', path: '/reports' },
    { icon: <Globe className="w-4 h-4" />, label: 'Online Store', path: '/storefront-builder' },
  ];

  return (
    <>
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col flex-shrink-0 sticky top-0 bg-white border-r border-slate-200" style={{ width: 240, height: '100vh', padding: '24px 16px', gap: 8 }}>
        <div style={{ marginBottom: 28, paddingLeft: 8 }}>
          <Logo size="md" />
        </div>

        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, border: 'none', background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#fff' : '#64748b', fontWeight: isActive ? 700 : 600,
                fontSize: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </aside>

      {/* Mobile Bottom Navigation (Hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] flex items-center justify-around px-2 py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center gap-1 w-full py-1 rounded-xl transition-colors ${isActive ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-green-50' : ''}`}>
                 {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
              </div>
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label.replace('Online Store', 'Store').replace('POS Billing', 'POS')}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
