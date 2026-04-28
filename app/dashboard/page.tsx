'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import { getContractsForChain } from '@/lib/contracts/addresses';
import { PRIMARY_CHAIN_ID, PRIMARY_CHAIN_NAME } from '@/lib/config/network';
import { signOutAdmin } from '@/lib/auth';
import {
  Cog6ToothIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowRightStartOnRectangleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { KYCReviewSystem } from '@/components/admin/KYCReviewSystem';
import { KYBReviewSystem } from '@/components/admin/KYBReviewSystem';
import { CreditScoreManagement } from '@/components/admin/CreditScoreManagement';
import { OTCOrdersManagement } from '@/components/admin/OTCOrdersManagement';
import { VaultsManagement } from '@/components/admin/VaultsManagement';
import { ContractsView } from '@/components/admin/ContractsView';
import FundingManagement from '@/components/admin/FundingManagement';

type Tab =
  | 'dashboard'
  | 'users'
  | 'kyc'
  | 'kyb'
  | 'creditScore'
  | 'otc'
  | 'funding'
  | 'vaults'
  | 'contracts';

const tabs: { id: Tab; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard',   name: 'Dashboard',     icon: ChartBarIcon },
  { id: 'users',       name: 'Users',          icon: UserGroupIcon },
  { id: 'kyc',         name: 'KYC Review',     icon: ShieldCheckIcon },
  { id: 'kyb',         name: 'KYB Review',     icon: BuildingOffice2Icon },
  { id: 'creditScore', name: 'Credit Score',   icon: SparklesIcon },
  { id: 'otc',         name: 'OTC Orders',     icon: ArrowsRightLeftIcon },
  { id: 'funding',     name: 'Funding',        icon: BanknotesIcon },
  { id: 'vaults',      name: 'Vaults',         icon: CubeIcon },
  { id: 'contracts',   name: 'Contracts',      icon: DocumentTextIcon },
];

export default function DashboardPage() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);
  const chainMismatch = chainId !== PRIMARY_CHAIN_ID;

  const [tab, setTab] = useState<Tab>('dashboard');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAdmin();
    router.replace('/');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#0f1219] border-r border-gray-800/50 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-base font-bold text-white">Convexo Admin</h1>
              <p className="text-xs text-gray-500">{contracts?.CHAIN_NAME ?? PRIMARY_CHAIN_NAME}</p>
            </div>
          </div>
        </div>

        {chainMismatch && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/40 flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Wallet on wrong chain. Expected{' '}
              <span className="font-semibold">{PRIMARY_CHAIN_NAME}</span>.
            </p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                tab === id
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/50 space-y-3">
          {address && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 font-mono truncate">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 text-sm transition-colors disabled:opacity-50"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        {tab === 'dashboard'   && <AdminDashboard />}
        {tab === 'users'       && <UserManagement />}
        {tab === 'kyc'         && <KYCReviewSystem />}
        {tab === 'kyb'         && <KYBReviewSystem />}
        {tab === 'creditScore' && <CreditScoreManagement />}
        {tab === 'otc'         && <OTCOrdersManagement />}
        {tab === 'funding'     && <FundingManagement />}
        {tab === 'vaults'      && <VaultsManagement />}
        {tab === 'contracts'   && <ContractsView />}
      </main>
    </div>
  );
}
