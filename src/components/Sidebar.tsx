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
    <aside style={{
      width: 240, background: '#fff', borderRight: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', padding: '24px 16px',
      gap: 8, flexShrink: 0, height: '100vh', position: 'sticky', top: 0
    }}>
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
  );
}
