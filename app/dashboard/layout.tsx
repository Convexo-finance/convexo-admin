'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_SESSION_CLEARED_EVENT, clearTokens, hasAdminSession } from '@/lib/api';

/**
 * Client-side gate only — real authorization is server-side (`requireAdmin`).
 * Lets in a stored session whose token carries `isAdmin` and is still usable
 * (valid access token, or a refresh token to renew it). Leaves the shell as
 * soon as the API reports the session dead (refresh failed / admin role gone).
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!hasAdminSession()) {
      clearTokens();
      router.replace('/');
      return;
    }
    setAllowed(true);

    const onCleared = () => router.replace('/');
    window.addEventListener(ADMIN_SESSION_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(ADMIN_SESSION_CLEARED_EVENT, onCleared);
  }, [router]);

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {children}
    </div>
  );
}
