'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl, IPFS } from '@/lib/contracts/addresses';
import { EcreditscoringABI } from '@/lib/contracts/abis';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import { apiFetch, ApiError } from '@/lib/api';
import {
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

type ScoreStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NFT_REQUESTED' | 'COMPLETE';

interface CreditScoreRequest {
  id: string;
  userId: string;
  status: ScoreStatus;
  score?: number | null;
  rating?: string | null;
  approved?: boolean | null;
  maxCreditLimit?: string | null;
  analysisNotes?: string | null;
  rejectionReason?: string | null;
  nftTokenId?: string | null;
  annualRevenue?: string | null;
  netProfit?: string | null;
  totalAssets?: string | null;
  totalLiabilities?: string | null;
  employeeCount?: number | null;
  yearsOperating?: number | null;
  existingDebt?: string | null;
  period?: string | null;
  createdAt: string;
  user: {
    walletAddress: string;
    businessProfile: { companyName: string; email?: string } | null;
  };
}

interface ListResponse { items: CreditScoreRequest[]; total: number }

const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Ecreditscoring CreditTier enum: None=0, Bronze=1, Silver=2, Gold=3, Platinum=4
function scoreToCreditTier(score: number): number {
  if (score >= 800) return 4; // Platinum
  if (score >= 650) return 3; // Gold
  if (score >= 500) return 2; // Silver
  return 1;                   // Bronze
}

function parseMaxLoan(val: string | null | undefined): bigint {
  if (!val) return 0n;
  const digits = val.replace(/[^0-9]/g, '');
  return digits ? BigInt(digits) : 0n;
}

const STATUS_STYLE: Record<ScoreStatus, string> = {
  PENDING:       'bg-amber-900/30 text-amber-300',
  UNDER_REVIEW:  'bg-blue-900/30 text-blue-300',
  APPROVED:      'bg-emerald-900/30 text-emerald-300',
  REJECTED:      'bg-red-900/30 text-red-300',
  NFT_REQUESTED: 'bg-purple-900/30 text-purple-300',
  COMPLETE:      'bg-gray-700 text-gray-300',
};

const TIER_LABEL = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'];

export function CreditScoreManagement() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [statusFilter, setStatusFilter] = useState<ScoreStatus | ''>('PENDING');
  const [requests, setRequests] = useState<CreditScoreRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selected, setSelected] = useState<CreditScoreRequest | null>(null);

  // Override form state
  const [approved, setApproved] = useState(true);
  const [score, setScore] = useState('');
  const [rating, setRating] = useState('');
  const [maxCreditLimit, setMaxCreditLimit] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [overrideMsg, setOverrideMsg] = useState('');

  const [recordMsg, setRecordMsg] = useState('');

  const { writeContract, data: mintHash, isPending: minting, error: mintError, reset: resetMint } = useConvexoWrite();
  const { isLoading: mintConfirming, isSuccess: mintSuccess, data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintHash });

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<ListResponse>(`/admin/credit-score-requests?${params}`);
      setRequests(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const selectRequest = (req: CreditScoreRequest) => {
    setSelected(req);
    setScore(req.score != null ? String(req.score) : '');
    setRating(req.rating ?? '');
    setMaxCreditLimit(req.maxCreditLimit ?? '');
    setAnalysisNotes(req.analysisNotes ?? '');
    setRejectionReason(req.rejectionReason ?? '');
    setApproved(req.approved ?? true);
    setOverrideMsg('');
    setRecordMsg('');
    resetMint();
  };

  const handleOverride = async () => {
    if (!selected) return;
    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 1000) {
      setOverrideMsg('Score must be 0–1000.');
      return;
    }
    if (!rating.trim()) {
      setOverrideMsg('Rating is required.');
      return;
    }
    setOverriding(true);
    setOverrideMsg('');
    try {
      const updated = await apiFetch<CreditScoreRequest>(`/admin/credit-score-requests/${selected.id}/result`, {
        method: 'PUT',
        body: JSON.stringify({
          approved,
          score: scoreNum,
          rating: rating.trim(),
          maxCreditLimit: maxCreditLimit.trim() || undefined,
          analysisNotes: analysisNotes.trim() || undefined,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });
      const merged: CreditScoreRequest = { ...selected, ...updated };
      setSelected(merged);
      setRequests((prev) => prev.map((r) => r.id === selected.id ? merged : r));
      setOverrideMsg(approved ? 'Approved successfully. Ready to mint NFT.' : 'Rejected successfully.');
    } catch (err) {
      setOverrideMsg(`Error: ${(err as Error).message}`);
    } finally {
      setOverriding(false);
    }
  };

  const handleMint = () => {
    if (!selected || !contracts?.ECREDITSCORING || selected.score == null) return;
    const tier = scoreToCreditTier(selected.score);
    writeContract({
      address: contracts.ECREDITSCORING as `0x${string}`,
      abi: EcreditscoringABI,
      functionName: 'safeMint',
      args: [
        selected.user.walletAddress as `0x${string}`,
        BigInt(selected.score),
        tier,
        parseMaxLoan(selected.maxCreditLimit),
        selected.id,
        IPFS.ECREDITSCORING_URI,
      ],
    });
  };

  useEffect(() => {
    if (!mintSuccess || !mintReceipt || !selected) return;
    const log = mintReceipt.logs.find((l) => l.topics[0] === TRANSFER_TOPIC0);
    if (!log?.topics[3]) return;
    const tokenId = BigInt(log.topics[3]).toString();
    apiFetch(`/admin/credit-score-requests/${selected.id}/nft`, {
      method: 'PUT',
      body: JSON.stringify({ nftTokenId: tokenId }),
    })
      .then(() => {
        setRecordMsg(`NFT tokenId #${tokenId} recorded. Status → COMPLETE.`);
        const updated: CreditScoreRequest = { ...selected, status: 'COMPLETE', nftTokenId: tokenId };
        setSelected(updated);
        setRequests((prev) => prev.map((r) => r.id === selected.id ? updated : r));
      })
      .catch((err: unknown) => setRecordMsg(`Mint succeeded but record failed: ${(err as Error).message}`));
  }, [mintSuccess, mintReceipt, selected]);

  const canOverride = selected && selected.status !== 'COMPLETE';
  const canMint = selected && (selected.status === 'APPROVED' || selected.status === 'NFT_REQUESTED') && selected.score != null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
          <SparklesIcon className="w-7 h-7 text-purple-400" />
          Credit Score Review
        </h2>
        <p className="text-gray-400 text-sm">Review n8n AI credit score requests and mint ECREDITSCORING NFTs (Tier 3).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List column */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(['', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'bg-purple-600/20 text-purple-300 border-purple-600/40'
                    : 'text-gray-400 hover:text-white bg-gray-800/50 border-transparent'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} requests</span>
            <button onClick={fetchList} disabled={loading} className="p-1 text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {listError && <p className="text-red-400 text-xs">{listError}</p>}

          <div className="space-y-2">
            {loading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)
              : requests.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">No requests found.</p>
              : requests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => selectRequest(req)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected?.id === req.id
                        ? 'border-purple-500 bg-purple-900/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white font-medium truncate">
                          {req.user.businessProfile?.companyName ?? req.user.walletAddress.slice(0, 12) + '…'}
                        </p>
                        {req.score != null && (
                          <p className="text-xs text-purple-300 mt-0.5">
                            Score: {req.score} · {req.rating ?? TIER_LABEL[scoreToCreditTier(req.score)]}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLE[req.status]}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Detail column */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card p-10 text-center">
              <SparklesIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Select a request to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="card p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">
                    {selected.user.businessProfile?.companyName ?? 'Business Account'}
                  </p>
                  <p className="text-xs font-mono text-gray-400 break-all">{selected.user.walletAddress}</p>
                  {selected.user.businessProfile?.email && (
                    <p className="text-xs text-gray-500">{selected.user.businessProfile.email}</p>
                  )}
                  <p className="text-xs text-gray-600">Submitted {new Date(selected.createdAt).toLocaleString()}</p>
                  {selected.nftTokenId && (
                    <p className="text-xs text-emerald-400 mt-1">NFT: #{selected.nftTokenId}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${STATUS_STYLE[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>

              {/* Financial metrics */}
              {(selected.annualRevenue || selected.netProfit || selected.totalAssets || selected.totalLiabilities) && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Financial Metrics</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Annual Revenue', selected.annualRevenue],
                      ['Net Profit', selected.netProfit],
                      ['Total Assets', selected.totalAssets],
                      ['Total Liabilities', selected.totalLiabilities],
                      ['Existing Debt', selected.existingDebt],
                      ['Employees', selected.employeeCount != null ? String(selected.employeeCount) : null],
                      ['Years Operating', selected.yearsOperating != null ? String(selected.yearsOperating) : null],
                      ['Period', selected.period],
                    ].filter(([, v]) => v != null).map(([label, value]) => (
                      <div key={label as string} className="p-2 bg-gray-800/50 rounded">
                        <span className="text-gray-500 block mb-0.5">{label as string}</span>
                        <span className="text-gray-200">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing result (n8n or previous override) */}
              {selected.score != null && selected.status !== 'PENDING' && (
                <div className="card p-4 border-purple-700/20 bg-purple-900/5">
                  <h3 className="text-sm font-semibold text-white mb-2">Current Result</h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2 bg-gray-800/50 rounded text-center">
                      <span className="text-gray-500 block mb-0.5">Score</span>
                      <span className="text-purple-300 text-lg font-bold">{selected.score}</span>
                    </div>
                    <div className="p-2 bg-gray-800/50 rounded text-center">
                      <span className="text-gray-500 block mb-0.5">Rating</span>
                      <span className="text-white font-medium">{selected.rating ?? '—'}</span>
                    </div>
                    <div className="p-2 bg-gray-800/50 rounded text-center">
                      <span className="text-gray-500 block mb-0.5">Tier</span>
                      <span className="text-purple-300 font-medium">{TIER_LABEL[scoreToCreditTier(selected.score)]}</span>
                    </div>
                  </div>
                  {selected.maxCreditLimit && (
                    <p className="text-xs text-gray-400 mt-2">Max credit limit: <span className="text-white">{selected.maxCreditLimit}</span></p>
                  )}
                  {selected.analysisNotes && (
                    <p className="text-xs text-gray-400 mt-1">Notes: <span className="text-gray-300">{selected.analysisNotes}</span></p>
                  )}
                  {selected.rejectionReason && (
                    <p className="text-xs text-red-400 mt-1">Rejection: {selected.rejectionReason}</p>
                  )}
                </div>
              )}

              {/* Override form */}
              {canOverride && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    {selected.score != null ? 'Override Result' : 'Set Result'}
                  </h3>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setApproved(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        approved
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'
                          : 'text-gray-400 bg-gray-800/50 border-transparent hover:text-white'
                      }`}
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setApproved(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        !approved
                          ? 'bg-red-600/20 text-red-300 border-red-600/40'
                          : 'text-gray-400 bg-gray-800/50 border-transparent hover:text-white'
                      }`}
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Reject
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Score (0–1000)</label>
                      <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="750"
                        min={0} max={1000}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Rating</label>
                      <input
                        type="text"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                        placeholder="A+ / BBB / 720"
                        maxLength={20}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Max Credit Limit</label>
                      <input
                        type="text"
                        value={maxCreditLimit}
                        onChange={(e) => setMaxCreditLimit(e.target.value)}
                        placeholder="50000"
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    {score && !isNaN(parseInt(score)) && (
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-gray-500">
                          Tier → <span className="text-purple-300 font-medium">{TIER_LABEL[scoreToCreditTier(parseInt(score, 10))]}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Analysis Notes</label>
                    <textarea
                      value={analysisNotes}
                      onChange={(e) => setAnalysisNotes(e.target.value)}
                      placeholder="Notes for the applicant..."
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none resize-none h-16"
                    />
                  </div>

                  {!approved && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-red-500 focus:outline-none resize-none h-16"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleOverride}
                    disabled={overriding}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {overriding ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                    {overriding ? 'Saving...' : 'Save Result'}
                  </button>

                  {overrideMsg && (
                    <p className={`text-sm ${overrideMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {overrideMsg}
                    </p>
                  )}
                </div>
              )}

              {/* NFT Mint */}
              {canMint && (
                <div className="card p-4 border-purple-700/30 bg-purple-900/10 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-purple-400" />
                    Mint ECREDITSCORING NFT (Tier 3)
                  </h3>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p>Recipient: <span className="font-mono text-white">{selected.user.walletAddress}</span></p>
                    <p>Score: <span className="text-purple-300">{selected.score}</span></p>
                    <p>Tier: <span className="text-purple-300">{TIER_LABEL[scoreToCreditTier(selected.score!)]}</span> (uint8 {scoreToCreditTier(selected.score!)})</p>
                    {selected.maxCreditLimit && (
                      <p>Max loan: <span className="text-white">{selected.maxCreditLimit}</span></p>
                    )}
                  </div>

                  {!mintHash ? (
                    <button
                      onClick={handleMint}
                      disabled={minting || !contracts?.ECREDITSCORING}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {minting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ClockIcon className="w-4 h-4" />}
                      {minting ? 'Waiting for wallet...' : 'Mint NFT'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {mintConfirming
                          ? <><ArrowPathIcon className="w-3.5 h-3.5 text-purple-400 animate-spin" /><span className="text-purple-300">Confirming...</span></>
                          : mintSuccess
                          ? <><CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Confirmed</span></>
                          : null}
                      </div>
                      <a
                        href={`${getBlockExplorerUrl(chainId)}/tx/${mintHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 underline font-mono"
                      >
                        {mintHash.slice(0, 10)}…{mintHash.slice(-6)} →
                      </a>
                    </div>
                  )}

                  {mintError && <p className="text-xs text-red-400">Error: {mintError.message}</p>}
                  {recordMsg && (
                    <p className={`text-xs font-medium ${recordMsg.includes('failed') ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {recordMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
