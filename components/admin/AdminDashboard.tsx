'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface StatsState {
  totalUsers: number;
  pendingVerifications: number;
  pendingOTC: number;
  rateCount: number;
}

interface UsersResponse {
  total: number;
}

interface VerificationsResponse {
  total: number;
}

interface OTCOrdersResponse {
  total: number;
}

interface Rate {
  pair: string;
  rate: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<StatsState>({
    totalUsers: 0,
    pendingVerifications: 0,
    pendingOTC: 0,
    rateCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError('');
      try {
        const [usersRes, verRes, otcRes, ratesRes] = await Promise.all([
          apiFetch<UsersResponse>('/admin/users?offset=0&limit=1'),
          apiFetch<VerificationsResponse>('/admin/verifications?status=PENDING&limit=1&offset=0'),
          apiFetch<OTCOrdersResponse>('/admin/otc/orders?status=PENDING&limit=1&offset=0'),
          apiFetch<Rate[]>('/rates'),
        ]);

        setStats({
          totalUsers: usersRes.total ?? 0,
          pendingVerifications: verRes.total ?? 0,
          pendingOTC: otcRes.total ?? 0,
          rateCount: Array.isArray(ratesRes) ? ratesRes.length : 0,
        });
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message ?? 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'purple',
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications,
      icon: ShieldCheckIcon,
      color: 'amber',
    },
    {
      label: 'Pending OTC Orders',
      value: stats.pendingOTC,
      icon: ArrowsRightLeftIcon,
      color: 'blue',
    },
    {
      label: 'Active Rates',
      value: stats.rateCount,
      icon: CurrencyDollarIcon,
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Admin Dashboard</h2>
        <p className="text-gray-400 text-sm">Real-time overview of the Convexo platform.</p>
      </div>

      {error && (
        <div className="card p-4 bg-red-900/20 border-red-700/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-700 rounded mt-2 animate-pulse" />
                  ) : (
                    <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                  )}
                </div>
                <Icon className={`w-12 h-12 text-${card.color}-400 opacity-50`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
