'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useChainId, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl, IPFS, getIPFSUrl } from '@/lib/contracts/addresses';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import {
  ConvexoPassportABI,
  LPIndividualsABI,
  LPBusinessABI,
  EcreditscoringABI,
  ReputationManagerABI,
} from '@/lib/contracts/abis';
import {
  CheckBadgeIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '@/lib/api';

// ── Backend types ─────────────────────────────────────────────────────────────

interface BackendUser {
  id: string;
  walletAddress: string;
  email?: string;
  accountType?: string;
  createdAt: string;
}

interface UsersListResponse {
  items: BackendUser[];
  total: number;
  page: number;
  limit: number;
}

interface Verification {
  id: string;
  userId: string;
  type: string;
  status: string;
  provider?: string;
  sessionId?: string;
  nftTokenId?: string;
  processedAt?: string;
  notes?: string;
}

interface UserDetail {
  user: BackendUser;
  profile: Record<string, unknown> | null;
  verifications: Verification[];
  reputation: Record<string, unknown> | null;
}

// ── On-chain types ────────────────────────────────────────────────────────────

type NFTType = 'lp_individuals' | 'lp_business' | 'ecreditscoring';

const PAGE_LIMIT = 20;

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-900/30 text-amber-300',
    IN_PROGRESS: 'bg-blue-900/30 text-blue-300',
    APPROVED: 'bg-emerald-900/30 text-emerald-300',
    REJECTED: 'bg-red-900/30 text-red-300',
    EXPIRED: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

// ── Backend users panel ───────────────────────────────────────────────────────

function BackendUserPanel() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Verification action state
  const [actionVerifId, setActionVerifId] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        offset: String((page - 1) * PAGE_LIMIT),
        limit: String(PAGE_LIMIT),
        ...(search ? { search } : {}),
      });
      const res = await apiFetch<UsersListResponse>(`/admin/users?${params}`);
      setUsers(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedUser(null);
    setActionMsg('');
    try {
      const res = await apiFetch<UserDetail>(`/admin/users/${userId}`);
      setSelectedUser(res);
    } catch (err: unknown) {
      setDetailError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerifAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!actionVerifId) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      await apiFetch(`/admin/verifications/${actionVerifId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: actionNotes || undefined }),
      });
      setActionMsg(`Verification ${status.toLowerCase()} successfully.`);
      if (selectedUser) fetchUserDetail(selectedUser.user.id);
    } catch (err: unknown) {
      setActionMsg(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordNFT = async () => {
    if (!actionVerifId || !nftTokenId) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      await apiFetch(`/admin/verifications/${actionVerifId}/nft`, {
        method: 'PUT',
        body: JSON.stringify({ nftTokenId }),
      });
      setActionMsg('NFT token ID recorded successfully.');
      if (selectedUser) fetchUserDetail(selectedUser.user.id);
    } catch (err: unknown) {
      setActionMsg(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & list */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Platform Users</h3>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by address or email..."
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
          />
          <button onClick={fetchUsers} className="btn-primary flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Search
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No users found.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                onClick={() => fetchUserDetail(u.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-mono text-white truncate">{u.walletAddress}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {u.email && <span className="text-xs text-gray-400">{u.email}</span>}
                    {u.accountType && (
                      <span className="text-xs bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded">
                        {u.accountType}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 ml-2">View &rarr;</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">{total} total users</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50 hover:border-purple-500 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-white" />
            </button>
            <span className="text-sm text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50 hover:border-purple-500 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* User detail panel */}
      {(detailLoading || detailError || selectedUser) && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">User Detail</h3>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Close
            </button>
          </div>

          {detailLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {detailError && <p className="text-red-400 text-sm">{detailError}</p>}

          {selectedUser && !detailLoading && (
            <div className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400 block mb-1">Wallet</span>
                  <span className="text-white font-mono break-all">{selectedUser.user.walletAddress}</span>
                </div>
                {selectedUser.user.email && (
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400 block mb-1">Email</span>
                    <span className="text-white">{selectedUser.user.email}</span>
                  </div>
                )}
                {selectedUser.user.accountType && (
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400 block mb-1">Account Type</span>
                    <span className="text-white">{selectedUser.user.accountType}</span>
                  </div>
                )}
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400 block mb-1">Member Since</span>
                  <span className="text-white">{new Date(selectedUser.user.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Verifications */}
              <div>
                <h4 className="text-white font-semibold mb-3">Verifications ({selectedUser.verifications.length})</h4>
                {selectedUser.verifications.length === 0 ? (
                  <p className="text-gray-400 text-sm">No verifications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.verifications.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          actionVerifId === v.id
                            ? 'border-purple-500 bg-purple-900/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                        }`}
                        onClick={() => { setActionVerifId(v.id); setActionNotes(''); setNftTokenId(v.nftTokenId ?? ''); setActionMsg(''); }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-medium">{v.type}</span>
                            {v.provider && <span className="text-gray-400 text-xs ml-2">via {v.provider}</span>}
                          </div>
                          <StatusBadge status={v.status} />
                        </div>
                        {v.sessionId && (
                          <p className="text-xs text-gray-500 mt-1 font-mono">Session: {v.sessionId}</p>
                        )}
                        {v.nftTokenId && (
                          <p className="text-xs text-emerald-400 mt-1">NFT: #{v.nftTokenId}</p>
                        )}
                        {v.processedAt && (
                          <p className="text-xs text-gray-600 mt-1">{new Date(v.processedAt).toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification actions */}
              {actionVerifId && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/30 space-y-4">
                  <p className="text-sm text-gray-400">
                    Actions for verification: <span className="text-purple-300 font-mono">{actionVerifId}</span>
                  </p>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add notes for approval or rejection..."
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none resize-none h-16"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerifAction('APPROVED')}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerifAction('REJECTED')}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Reject
                    </button>
                  </div>

                  {/* Record NFT */}
                  <div className="border-t border-gray-700 pt-4">
                    <label className="text-xs text-gray-400 mb-1 block">Record NFT Token ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nftTokenId}
                        onChange={(e) => setNftTokenId(e.target.value)}
                        placeholder="Token ID..."
                        className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={handleRecordNFT}
                        disabled={actionLoading || !nftTokenId}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                      >
                        {actionLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>

                  {actionMsg && (
                    <p className={`text-sm ${actionMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {actionMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── On-chain mint section (unchanged) ─────────────────────────────────────────

function OnChainMintSection() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [selectedNFT, setSelectedNFT] = useState<NFTType>('lp_individuals');
  const [recipient, setRecipient] = useState('');
  const [uri, setUri] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');

  // LP Individuals fields
  const [verificationId, setVerificationId] = useState('');

  // LP Business fields
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [businessType, setBusinessType] = useState<0 | 1 | 2>(0);
  const [sumsubApplicantId, setSumsubApplicantId] = useState('');

  // Ecreditscoring fields
  const [creditScore, setCreditScore] = useState('');
  const [creditTier, setCreditTier] = useState<0 | 1 | 2 | 3>(0);
  const [maxLoanAmount, setMaxLoanAmount] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const { writeContract, data: hash, isPending, error: writeError } = useConvexoWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: userDetails, refetch: refetchUserDetails } = useReadContract({
    address: contracts?.REPUTATION_MANAGER,
    abi: ReputationManagerABI,
    functionName: 'getReputationDetails',
    args: lookupAddress ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: !!lookupAddress && lookupAddress.startsWith('0x') },
  });

  const nftTypes = [
    {
      id: 'lp_individuals' as NFTType,
      name: 'LP Individuals',
      description: 'Tier 2 - Veriff KYC',
      icon: UserGroupIcon,
      color: 'blue',
      ipfsHash: IPFS.LP_INDIVIDUALS_HASH,
      contractAddress: contracts?.LP_INDIVIDUALS,
      abi: LPIndividualsABI,
      defaultUri: IPFS.LP_INDIVIDUALS_URI,
    },
    {
      id: 'lp_business' as NFTType,
      name: 'LP Business',
      description: 'Tier 2 - Sumsub KYB',
      icon: BuildingOffice2Icon,
      color: 'cyan',
      ipfsHash: IPFS.LP_BUSINESS_HASH,
      contractAddress: contracts?.LP_BUSINESS,
      abi: LPBusinessABI,
      defaultUri: IPFS.LP_BUSINESS_URI,
    },
    {
      id: 'ecreditscoring' as NFTType,
      name: 'Ecreditscoring',
      description: 'Tier 3 - AI Credit Score',
      icon: SparklesIcon,
      color: 'purple',
      ipfsHash: IPFS.ECREDITSCORING_HASH,
      contractAddress: contracts?.ECREDITSCORING,
      abi: EcreditscoringABI,
      defaultUri: IPFS.ECREDITSCORING_URI,
    },
  ];

  const selectedNFTConfig = nftTypes.find((nft) => nft.id === selectedNFT);

  const handleMint = () => {
    if (!recipient || !selectedNFTConfig || !selectedNFTConfig.contractAddress) {
      alert('Please fill in recipient address');
      return;
    }

    let args: unknown[] = [];

    if (selectedNFT === 'lp_individuals') {
      if (!verificationId) { alert('Please fill in verification ID for LP Individuals'); return; }
      args = [recipient as `0x${string}`, verificationId, uri || selectedNFTConfig.defaultUri];
    } else if (selectedNFT === 'lp_business') {
      if (!companyName || !registrationNumber || !jurisdiction || !sumsubApplicantId) {
        alert('Please fill in all LP Business fields'); return;
      }
      args = [recipient as `0x${string}`, companyName, registrationNumber, jurisdiction, businessType, sumsubApplicantId, uri || selectedNFTConfig.defaultUri];
    } else if (selectedNFT === 'ecreditscoring') {
      if (!creditScore || !maxLoanAmount || !referenceId) {
        alert('Please fill in all Ecreditscoring fields (score, tier, max loan amount, reference ID)'); return;
      }
      args = [recipient as `0x${string}`, BigInt(creditScore), creditTier, BigInt(maxLoanAmount), referenceId, uri || selectedNFTConfig.defaultUri];
    }

    writeContract({
      address: selectedNFTConfig.contractAddress as `0x${string}`,
      abi: selectedNFTConfig.abi,
      functionName: 'safeMint',
      args,
    });
  };

  const handleLookup = () => {
    if (lookupAddress && lookupAddress.startsWith('0x')) refetchUserDetails();
  };

  const getTierName = (tier: number) => {
    const tiers = ['None', 'Passport', 'Limited Partner', 'Vault Creator'];
    return tiers[tier] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* User Lookup */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">On-Chain User Lookup</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x... address to lookup"
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
          <button onClick={handleLookup} className="btn-primary flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Lookup
          </button>
        </div>

        {userDetails && Array.isArray(userDetails) ? (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Tier</span>
              <span className="text-white font-medium">
                {getTierName(Number(userDetails[0]))} (Tier {Number(userDetails[0])})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Passport Balance</span>
              <span className="text-emerald-400 font-medium">{userDetails[1]?.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">LP Individuals Balance</span>
              <span className="text-blue-400 font-medium">{userDetails[2]?.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">LP Business Balance</span>
              <span className="text-cyan-400 font-medium">{userDetails[3]?.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Ecreditscoring Balance</span>
              <span className="text-purple-400 font-medium">{userDetails[4]?.toString()}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* NFT Minting */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Mint NFT (On-Chain)</h3>

        {/* NFT Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {nftTypes.map((nft) => {
            const Icon = nft.icon;
            const isSelected = selectedNFT === nft.id;
            return (
              <button
                key={nft.id}
                onClick={() => { setSelectedNFT(nft.id); setUri(nft.defaultUri); }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 overflow-hidden border border-gray-600">
                    <Image
                      src={getIPFSUrl(nft.ipfsHash)}
                      alt={nft.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">{nft.name}</p>
                    <p className="text-xs text-gray-400">{nft.description}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{nft.ipfsHash.substring(0, 16)}...</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mint Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {selectedNFT === 'lp_individuals' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Verification ID</label>
              <input
                type="text"
                value={verificationId}
                onChange={(e) => setVerificationId(e.target.value)}
                placeholder="Veriff verification ID"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">The verification ID from Veriff KYC process</p>
            </div>
          )}

          {selectedNFT === 'lp_business' && (
            <>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company legal name" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Registration Number</label>
                <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Company registration/tax ID" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Jurisdiction</label>
                <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Country/State of incorporation" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Business Type</label>
                <select value={businessType} onChange={(e) => setBusinessType(Number(e.target.value) as 0 | 1 | 2)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none">
                  <option value={0}>LLC</option>
                  <option value={1}>Corporation</option>
                  <option value={2}>Partnership</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Sumsub Applicant ID</label>
                <input type="text" value={sumsubApplicantId} onChange={(e) => setSumsubApplicantId(e.target.value)} placeholder="Sumsub applicant ID from KYB" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
            </>
          )}

          {selectedNFT === 'ecreditscoring' && (
            <>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Credit Score (0-999)</label>
                <input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} placeholder="e.g., 750" min="0" max="999" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Credit Tier</label>
                <select value={creditTier} onChange={(e) => setCreditTier(Number(e.target.value) as 0 | 1 | 2 | 3)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none">
                  <option value={0}>Poor (0-400)</option>
                  <option value={1}>Fair (401-600)</option>
                  <option value={2}>Good (601-800)</option>
                  <option value={3}>Excellent (801-999)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Max Loan Amount (Wei)</label>
                <input type="number" value={maxLoanAmount} onChange={(e) => setMaxLoanAmount(e.target.value)} placeholder="e.g., 1000000000000000000" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm" />
                <p className="text-xs text-gray-500 mt-1">Maximum loan amount in Wei (1 ETH = 1e18 Wei)</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Reference ID</label>
                <input type="text" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Unique reference ID for this credit assessment" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none" />
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Token URI (IPFS)</label>
            <input
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="ipfs://..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Default IPFS URI is pre-filled. Modify only if needed.</p>
          </div>

          <button
            onClick={handleMint}
            disabled={isPending || isConfirming || !recipient}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? 'Processing...' : isSuccess ? 'Minted Successfully!' : `Mint ${selectedNFTConfig?.name}`}
          </button>

          {writeError && (
            <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
              Error: {writeError.message}
            </div>
          )}

          {isSuccess && hash && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg text-emerald-400 text-sm">
              Transaction successful!{' '}
              <a href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">
                View on Explorer
              </a>
            </div>
          )}
        </div>
      </div>

      {/* IPFS Metadata Info */}
      <div className="card p-6 bg-blue-900/10 border-blue-700/30">
        <h3 className="text-lg font-semibold text-white mb-3">NFT Metadata (IPFS)</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-40 flex-shrink-0">Convexo Passport:</span>
            <code className="text-emerald-400 font-mono text-xs break-all">{IPFS.CONVEXO_PASSPORT_URI}</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-40 flex-shrink-0">LP Individuals:</span>
            <code className="text-blue-400 font-mono text-xs break-all">{IPFS.LP_INDIVIDUALS_URI}</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-40 flex-shrink-0">LP Business:</span>
            <code className="text-cyan-400 font-mono text-xs break-all">{IPFS.LP_BUSINESS_URI}</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-40 flex-shrink-0">Ecreditscoring:</span>
            <code className="text-purple-400 font-mono text-xs break-all">{IPFS.ECREDITSCORING_URI}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type UserMgmtTab = 'backend' | 'onchain';

export function UserManagement() {
  const [tab, setTab] = useState<UserMgmtTab>('backend');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-1">
          <button
            onClick={() => setTab('backend')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              tab === 'backend'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            Backend Users
          </button>
          <button
            onClick={() => setTab('onchain')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              tab === 'onchain'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <CheckBadgeIcon className="w-5 h-5" />
            On-Chain / Mint NFT
          </button>
        </nav>
      </div>

      {tab === 'backend' && <BackendUserPanel />}
      {tab === 'onchain' && <OnChainMintSection />}
    </div>
  );
}
