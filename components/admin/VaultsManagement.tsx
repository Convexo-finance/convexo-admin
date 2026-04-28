'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CubeIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { apiFetch, ApiError } from '@/lib/api';
import { getBlockExplorerUrl } from '@/lib/contracts/addresses';
import { useChainId } from 'wagmi';

interface Vault {
  id: string;
  onchainVaultId: string;
  vaultAddress: string;
  chainId: number;
  name: string;
  symbol: string;
  principalAmount: string;
  interestRate: string;
  protocolFeeRate: string;
  maturityDate: string;
  totalShareSupply: string;
  minInvestment: string;
  borrowerAddress: string;
  fundingRequestId?: string | null;
  txHash?: string | null;
  createdAt: string;
}

interface ListResponse { items: Vault[]; total: number }

function fmt6(raw: string): string {
  try { return (Number(raw) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  catch { return raw; }
}

function bps(raw: string): string {
  try { return `${(Number(raw) / 100).toFixed(2)}%`; }
  catch { return raw; }
}

const EMPTY_FORM = {
  onchainVaultId: '',
  vaultAddress: '',
  chainId: '84532',
  name: '',
  symbol: '',
  principalAmount: '',
  interestRate: '',
  protocolFeeRate: '',
  maturityDate: '',
  totalShareSupply: '',
  minInvestment: '',
  borrowerAddress: '',
  fundingRequestId: '',
  txHash: '',
};

export function VaultsManagement() {
  const chainId = useChainId();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState<Vault | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState('');

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await apiFetch<ListResponse>('/vaults?limit=50&offset=0');
      setVaults(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVaults(); }, [fetchVaults]);

  const handleRegister = async () => {
    setRegistering(true);
    setRegisterMsg('');
    try {
      const payload: Record<string, unknown> = {
        onchainVaultId:  form.onchainVaultId.trim(),
        vaultAddress:    form.vaultAddress.trim(),
        chainId:         parseInt(form.chainId, 10),
        name:            form.name.trim(),
        symbol:          form.symbol.trim(),
        principalAmount: form.principalAmount.trim(),
        interestRate:    form.interestRate.trim(),
        protocolFeeRate: form.protocolFeeRate.trim(),
        maturityDate:    form.maturityDate,
        totalShareSupply: form.totalShareSupply.trim(),
        minInvestment:   form.minInvestment.trim(),
        borrowerAddress: form.borrowerAddress.trim(),
      };
      if (form.fundingRequestId.trim()) payload.fundingRequestId = form.fundingRequestId.trim();
      if (form.txHash.trim()) payload.txHash = form.txHash.trim();

      const vault = await apiFetch<Vault>('/admin/vaults', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setVaults((prev) => [vault, ...prev]);
      setTotal((t) => t + 1);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setRegisterMsg('Vault registered successfully.');
    } catch (err) {
      setRegisterMsg(`Error: ${(err as Error).message}`);
    } finally {
      setRegistering(false);
    }
  };

  const explorerUrl = getBlockExplorerUrl(chainId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <CubeIcon className="w-7 h-7 text-indigo-400" />
            Vaults
          </h2>
          <p className="text-gray-400 text-sm">Registered TokenizedBondVault contracts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchVaults} disabled={loading} className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setRegisterMsg(''); }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusCircleIcon className="w-4 h-4" />
            Register Vault
            {showForm ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {listError && <p className="text-red-400 text-sm">{listError}</p>}

      {/* Register form */}
      {showForm && (
        <div className="card p-6 border-indigo-700/30 bg-indigo-900/5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Register On-Chain Vault</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Vault Address (0x…)', 'vaultAddress', 'text', '0x…'],
              ['On-chain Vault ID', 'onchainVaultId', 'text', 'uint256 from VaultFactory'],
              ['Name', 'name', 'text', 'e.g. Convexo Bond Series A'],
              ['Symbol', 'symbol', 'text', 'e.g. CBS-A'],
              ['Principal Amount (USDC units 6dec)', 'principalAmount', 'text', '50000000000'],
              ['Interest Rate (bps)', 'interestRate', 'text', '850 = 8.5%'],
              ['Protocol Fee Rate (bps)', 'protocolFeeRate', 'text', '50 = 0.5%'],
              ['Total Share Supply (6dec)', 'totalShareSupply', 'text', '50000000000'],
              ['Min Investment (USDC units 6dec)', 'minInvestment', 'text', '100000000'],
              ['Borrower Address (0x…)', 'borrowerAddress', 'text', '0x…'],
              ['Maturity Date', 'maturityDate', 'date', ''],
              ['Chain ID', 'chainId', 'number', '84532'],
              ['Funding Request ID (optional)', 'fundingRequestId', 'text', ''],
              ['Deploy Tx Hash (optional)', 'txHash', 'text', '0x…'],
            ].map(([label, key, type, placeholder]) => (
              <div key={key as string}>
                <label className="text-xs text-gray-400 mb-1 block">{label as string}</label>
                <input
                  type={type as string}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key as string]: e.target.value }))}
                  placeholder={placeholder as string}
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegister}
              disabled={registering}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {registering && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              {registering ? 'Registering...' : 'Register'}
            </button>
            <button
              onClick={() => { setShowForm(false); setRegisterMsg(''); }}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
          {registerMsg && (
            <p className={`text-sm ${registerMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {registerMsg}
            </p>
          )}
        </div>
      )}

      {/* Vault list */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">{total} Vault{total !== 1 ? 's' : ''}</h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : vaults.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No vaults registered yet.</p>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                onClick={() => setSelected(selected?.id === vault.id ? null : vault)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selected?.id === vault.id
                    ? 'border-indigo-500 bg-indigo-900/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{vault.name}</p>
                      <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{vault.symbol}</span>
                      <span className="text-xs text-gray-600">Chain {vault.chainId}</span>
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{vault.vaultAddress}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-white font-medium">${fmt6(vault.principalAmount)}</p>
                    <p className="text-xs text-gray-400">{bps(vault.interestRate)} APR</p>
                  </div>
                </div>

                {selected?.id === vault.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {[
                      ['Vault ID (on-chain)', vault.onchainVaultId],
                      ['Principal', `$${fmt6(vault.principalAmount)} USDC`],
                      ['Interest Rate', bps(vault.interestRate)],
                      ['Protocol Fee', bps(vault.protocolFeeRate)],
                      ['Min Investment', `$${fmt6(vault.minInvestment)} USDC`],
                      ['Total Shares', fmt6(vault.totalShareSupply)],
                      ['Maturity', new Date(vault.maturityDate).toLocaleDateString()],
                      ['Registered', new Date(vault.createdAt).toLocaleDateString()],
                    ].map(([label, value]) => (
                      <div key={label as string} className="p-2 bg-gray-800/50 rounded">
                        <span className="text-gray-500 block mb-0.5">{label as string}</span>
                        <span className="text-gray-200">{value as string}</span>
                      </div>
                    ))}
                    <div className="col-span-2 md:col-span-3 p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-500 block mb-0.5">Borrower</span>
                      <span className="text-gray-200 font-mono break-all">{vault.borrowerAddress}</span>
                    </div>
                    {vault.txHash && (
                      <div className="col-span-2 md:col-span-3 p-2 bg-gray-800/50 rounded">
                        <span className="text-gray-500 block mb-0.5">Deploy Tx</span>
                        <a
                          href={`${explorerUrl}/tx/${vault.txHash}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-indigo-400 hover:text-indigo-300 underline font-mono text-xs"
                        >
                          {vault.txHash.slice(0, 18)}…
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
