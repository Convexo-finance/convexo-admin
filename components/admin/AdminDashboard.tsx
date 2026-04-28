'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  totalUsers: number;
  pendingKYC: number;
  pendingKYB: number;
  pendingCreditScore: number;
  pendingOTC: number;
  activeRates: number;
}

interface TotalResponse { total: number }
interface Rate { pair: string; rate: number }

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingKYC: 0,
    pendingKYB: 0,
    pendingCreditScore: 0,
    pendingOTC: 0,
    activeRates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchStats() {
    setLoading(true);
    setError('');
    try {
      const [users, kyc, kyb, cs, otc, rates] = await Promise.all([
        apiFetch<TotalResponse>('/admin/users?offset=0&limit=1'),
        apiFetch<TotalResponse>('/admin/kyc/submissions?status=PENDING&limit=1&offset=0'),
        apiFetch<TotalResponse>('/admin/kyb/submissions?status=PENDING&limit=1&offset=0'),
        apiFetch<TotalResponse>('/admin/credit-score-requests?status=PENDING&limit=1&offset=0'),
        apiFetch<TotalResponse>('/admin/otc/orders?status=PENDING&limit=1&offset=0'),
        apiFetch<Rate[]>('/rates'),
      ]);
      setStats({
        totalUsers:        users.total ?? 0,
        pendingKYC:        kyc.total ?? 0,
        pendingKYB:        kyb.total ?? 0,
        pendingCreditScore: cs.total ?? 0,
        pendingOTC:        otc.total ?? 0,
        activeRates:       Array.isArray(rates) ? rates.length : 0,
      });
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = [
    { label: 'Total Users',           value: stats.totalUsers,        icon: UserGroupIcon,       color: 'purple' },
    { label: 'Pending KYC',           value: stats.pendingKYC,        icon: ShieldCheckIcon,     color: 'blue'   },
    { label: 'Pending KYB',           value: stats.pendingKYB,        icon: BuildingOffice2Icon, color: 'cyan'   },
    { label: 'Pending Credit Score',  value: stats.pendingCreditScore, icon: SparklesIcon,        color: 'purple' },
    { label: 'Pending OTC Orders',    value: stats.pendingOTC,        icon: ArrowsRightLeftIcon, color: 'amber'  },
    { label: 'Active Rates',          value: stats.activeRates,       icon: CurrencyDollarIcon,  color: 'emerald'},
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Dashboard</h2>
          <p className="text-gray-400 text-sm">Real-time overview of the Convexo platform.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
          title="Refresh"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="card p-4 bg-red-900/20 border-red-700/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                {loading ? (
                  <div className="h-8 w-14 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
                )}
              </div>
              <Icon className={`w-10 h-10 text-${color}-400 opacity-30`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
