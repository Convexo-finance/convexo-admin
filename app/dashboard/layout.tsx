'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
    }
  }, [router]);

  if (typeof window !== 'undefined' && !getToken()) return null;

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {children}
    </div>
  );
}
