'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl, IPFS } from '@/lib/contracts/addresses';
import { LPIndividualsABI } from '@/lib/contracts/abis';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import { apiFetch, apiDownload, ApiError } from '@/lib/api';
import {
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface KycDoc {
  id: string;
  fieldName: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface KycSubmission {
  id: string;
  userId: string;
  status: SubmissionStatus;
  reviewNote?: string;
  createdAt: string;
  user: {
    walletAddress: string;
    individualProfile: { firstName: string; lastName: string; email?: string } | null;
  };
  documents: KycDoc[];
}

interface ListResponse { items: KycSubmission[]; total: number }

interface UserVerification { id: string; type: string; provider: string; status: string; nftTokenId?: string }
interface UserDetailResponse { user: { id: string }; verifications: UserVerification[] }

const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  PENDING:  'bg-amber-900/30 text-amber-300',
  APPROVED: 'bg-emerald-900/30 text-emerald-300',
  REJECTED: 'bg-red-900/30 text-red-300',
};

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function KYCReviewSystem() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | ''>('PENDING');
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  const [verifId, setVerifId] = useState<string | null>(null);
  const [recordMsg, setRecordMsg] = useState('');

  const { writeContract, data: mintHash, isPending: minting, error: mintError, reset: resetMint } = useConvexoWrite();
  const { isLoading: mintConfirming, isSuccess: mintSuccess, data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintHash });

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<ListResponse>(`/admin/kyc/submissions?${params}`);
      setSubmissions(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const fetchVerifId = useCallback(async (userId: string) => {
    try {
      const res = await apiFetch<UserDetailResponse>(`/admin/users/${userId}`);
      const v = res.verifications.find((v) => v.type === 'KYC_INDIVIDUAL' && v.provider === 'INTERNAL');
      if (v) setVerifId(v.id);
    } catch { /* non-fatal */ }
  }, []);

  const selectSubmission = (sub: KycSubmission) => {
    setSelected(sub);
    setReviewNote('');
    setReviewMsg('');
    setRecordMsg('');
    setVerifId(null);
    resetMint();
    if (sub.status === 'APPROVED') fetchVerifId(sub.userId);
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selected) return;
    setReviewing(true);
    setReviewMsg('');
    try {
      await apiFetch(`/admin/kyc/submissions/${selected.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNote: reviewNote || undefined }),
      });
      const updated: KycSubmission = { ...selected, status, reviewNote: reviewNote || undefined };
      setSelected(updated);
      setSubmissions((prev) => prev.map((s) => s.id === selected.id ? updated : s));
      setReviewMsg(`Submission ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      if (status === 'APPROVED') fetchVerifId(selected.userId);
    } catch (err) {
      setReviewMsg(`Error: ${(err as Error).message}`);
    } finally {
      setReviewing(false);
    }
  };

  const handleMint = () => {
    if (!selected || !contracts?.LP_INDIVIDUALS) return;
    writeContract({
      address: contracts.LP_INDIVIDUALS as `0x${string}`,
      abi: LPIndividualsABI,
      functionName: 'safeMint',
      args: [selected.user.walletAddress as `0x${string}`, selected.id, IPFS.LP_INDIVIDUALS_URI],
    });
  };

  useEffect(() => {
    if (!mintSuccess || !mintReceipt || !verifId) return;
    const log = mintReceipt.logs.find((l) => l.topics[0] === TRANSFER_TOPIC0);
    if (!log?.topics[3]) return;
    const tokenId = BigInt(log.topics[3]).toString();
    apiFetch(`/admin/verifications/${verifId}/nft`, {
      method: 'PUT',
      body: JSON.stringify({ nftTokenId: tokenId }),
    })
      .then(() => setRecordMsg(`NFT tokenId #${tokenId} recorded successfully.`))
      .catch((err: unknown) => setRecordMsg(`Mint succeeded but record failed: ${(err as Error).message}`));
  }, [mintSuccess, mintReceipt, verifId]);

  const handleDownload = async (doc: KycDoc) => {
    try {
      const { blob, contentType, filename } = await apiDownload(`/admin/submissions/documents/${doc.id}`);
      const url = URL.createObjectURL(blob);
      if (contentType.startsWith('image/') || contentType === 'application/pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      alert(`Download failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
          <ShieldCheckIcon className="w-7 h-7 text-blue-400" />
          KYC Review — Individual Submissions
        </h2>
        <p className="text-gray-400 text-sm">Review identity documents and approve/reject KYC for individual accounts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List column */}
        <div className="space-y-3">
          <div className="flex gap-1">
            {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                    : 'text-gray-400 hover:text-white bg-gray-800/50 border-transparent'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} submissions</span>
            <button onClick={fetchList} disabled={loading} className="p-1 text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {listError && <p className="text-red-400 text-xs">{listError}</p>}

          <div className="space-y-2">
            {loading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)
              : submissions.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">No submissions found.</p>
              : submissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected?.id === sub.id
                        ? 'border-blue-500 bg-blue-900/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-gray-300 truncate">{sub.user.walletAddress}</p>
                        {sub.user.individualProfile && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {sub.user.individualProfile.firstName} {sub.user.individualProfile.lastName}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(sub.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLE[sub.status]}`}>
                        {sub.status}
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
              <UserIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Select a submission to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User header */}
              <div className="card p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-mono text-white break-all">{selected.user.walletAddress}</p>
                  {selected.user.individualProfile && (
                    <p className="text-sm text-gray-300 mt-1">
                      {selected.user.individualProfile.firstName} {selected.user.individualProfile.lastName}
                      {selected.user.individualProfile.email && (
                        <span className="text-gray-500 ml-2 text-xs">{selected.user.individualProfile.email}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Submitted {new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${STATUS_STYLE[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              {/* Documents */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Documents ({selected.documents.length})</h3>
                {selected.documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No documents uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div>
                          <p className="text-sm text-white">{doc.fieldName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{doc.filename} · {bytes(doc.sizeBytes)}</p>
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                        >
                          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review form — PENDING only */}
              {selected.status === 'PENDING' && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Review Decision</h3>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Note (optional)</label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Approval notes or rejection reason..."
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-purple-500 focus:outline-none resize-none h-20"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={reviewing}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={reviewing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                  {reviewMsg && (
                    <p className={`text-sm ${reviewMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {reviewMsg}
                    </p>
                  )}
                </div>
              )}

              {/* Rejection note */}
              {selected.status === 'REJECTED' && selected.reviewNote && (
                <div className="card p-4 border-red-700/30 bg-red-900/10">
                  <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{selected.reviewNote}</p>
                </div>
              )}

              {/* NFT Mint — APPROVED only */}
              {selected.status === 'APPROVED' && (
                <div className="card p-4 border-blue-700/30 bg-blue-900/10 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                    Mint LP_Individuals NFT (Tier 2)
                  </h3>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p>Recipient: <span className="font-mono text-white">{selected.user.walletAddress}</span></p>
                    <p>Verification ID: <span className="font-mono text-white">{selected.id}</span></p>
                    {!verifId && <p className="text-amber-400">⚠ Backend verification record not found — NFT tokenId cannot be auto-recorded.</p>}
                  </div>

                  {!mintHash ? (
                    <button
                      onClick={handleMint}
                      disabled={minting || !contracts?.LP_INDIVIDUALS}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {minting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ClockIcon className="w-4 h-4" />}
                      {minting ? 'Waiting for wallet...' : 'Mint NFT'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {mintConfirming
                          ? <><ArrowPathIcon className="w-3.5 h-3.5 text-blue-400 animate-spin" /><span className="text-blue-300">Confirming...</span></>
                          : mintSuccess
                          ? <><CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Confirmed</span></>
                          : null}
                      </div>
                      <a
                        href={`${getBlockExplorerUrl(chainId)}/tx/${mintHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline font-mono"
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
