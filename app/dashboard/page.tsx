'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import { getContractsForChain } from '@/lib/contracts/addresses';
import { signOutAdmin } from '@/lib/auth';
import {
  Cog6ToothIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { VeriffVerificationSystem } from '@/components/admin/VeriffVerificationSystem';
import { SumsubVerificationSystem } from '@/components/admin/SumsubVerificationSystem';
import { VaultsManagement } from '@/components/admin/VaultsManagement';
import { TreasuriesView } from '@/components/admin/TreasuriesView';
import { ContractsView } from '@/components/admin/ContractsView';
import { NFTAdminPanel } from '@/components/admin/NFTAdminPanel';
import FundingManagement from '@/components/admin/FundingManagement';

type Tab = 'dashboard' | 'users' | 'verification' | 'nft' | 'vaults' | 'funding' | 'treasuries' | 'contracts';
type VerifTab = 'veriff' | 'sumsub';
type NftTab = 'lpIndividuals' | 'lpBusiness';

const tabs: { id: Tab; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard',    name: 'Dashboard',     icon: ChartBarIcon },
  { id: 'users',        name: 'Users',          icon: UserGroupIcon },
  { id: 'verification', name: 'Verifications',  icon: ShieldCheckIcon },
  { id: 'nft',          name: 'NFT Management', icon: CubeIcon },
  { id: 'vaults',       name: 'Vaults',         icon: CubeIcon },
  { id: 'funding',      name: 'Funding',        icon: BanknotesIcon },
  { id: 'treasuries',   name: 'Treasuries',     icon: BuildingLibraryIcon },
  { id: 'contracts',    name: 'Contracts',      icon: DocumentTextIcon },
];

export default function DashboardPage() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [verifTab, setVerifTab] = useState<VerifTab>('veriff');
  const [nftTab, setNftTab] = useState<NftTab>('lpIndividuals');
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
              <p className="text-xs text-gray-500">{contracts?.CHAIN_NAME ?? 'Unknown chain'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
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
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'users' && <UserManagement />}

        {tab === 'verification' && (
          <div className="space-y-6">
            <div className="border-b border-gray-800 flex gap-1">
              {(['veriff', 'sumsub'] as VerifTab[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVerifTab(v)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    verifTab === v ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {v === 'veriff' ? 'Veriff KYC (Individuals)' : 'Sumsub KYB (Business)'}
                </button>
              ))}
            </div>
            {verifTab === 'veriff' && <VeriffVerificationSystem />}
            {verifTab === 'sumsub' && <SumsubVerificationSystem />}
          </div>
        )}

        {tab === 'nft' && (
          <div className="space-y-6">
            <div className="border-b border-gray-800 flex gap-1">
              {(['lpIndividuals', 'lpBusiness'] as NftTab[]).map(n => (
                <button
                  key={n}
                  onClick={() => setNftTab(n)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    nftTab === n ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {n === 'lpIndividuals' ? 'LP Individuals NFT' : 'LP Business NFT'}
                </button>
              ))}
            </div>
            <NFTAdminPanel type={nftTab} />
          </div>
        )}

        {tab === 'vaults'     && <VaultsManagement />}
        {tab === 'funding'    && <FundingManagement />}
        {tab === 'treasuries' && <TreasuriesView />}
        {tab === 'contracts'  && <ContractsView />}
      </main>
    </div>
  );
}
