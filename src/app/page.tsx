'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/pos');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}
