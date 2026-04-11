'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { BanknotesIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type FundingStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'VAULT_CREATED';

interface FundingRequest {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  term?: number;
  collateral?: string;
  status: FundingStatus;
  vaultId?: string;
  adminNotes?: string;
  createdAt: string;
  user: {
    walletAddress: string;
    businessProfile?: {
      companyName?: string;
      email?: string;
      repFirstName?: string;
      repLastName?: string;
    };
  };
}

interface ListResponse {
  items: FundingRequest[];
  total: number;
}

const STATUS_BADGE: Record<FundingStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
  UNDER_REVIEW: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  APPROVED: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
  REJECTED: 'bg-red-900/40 text-red-400 border border-red-700/40',
  VAULT_CREATED: 'bg-purple-900/40 text-purple-300 border border-purple-700/40',
};

export default function FundingManagement() {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FundingStatus | ''>('');
  const [selected, setSelected] = useState<FundingRequest | null>(null);

  // Review form
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'>('UNDER_REVIEW');
  const [adminNotes, setAdminNotes] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<ListResponse>(`/admin/funding/requests?${params}`);
      setRequests(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setReviewing(true);
    setReviewError(null);
    try {
      await apiFetch(`/admin/funding/requests/${selected.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          status: reviewStatus,
          adminNotes: adminNotes.trim() || undefined,
          vaultId: vaultId.trim() || undefined,
        }),
      });
      setSelected(null);
      setAdminNotes('');
      setVaultId('');
      await load();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <BanknotesIcon className="w-6 h-6 text-purple-400" />
          Funding Requests ({total})
        </h2>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as FundingStatus | '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="VAULT_CREATED">Vault Created</option>
        </select>
      </div>

      {error && (
        <div className="card bg-red-900/20 border-red-700/50 p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <BanknotesIcon className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">No funding requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">
                      {req.amount.toLocaleString()} {req.currency}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[req.status]}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {req.user.businessProfile?.companyName ?? req.user.walletAddress.slice(0, 10) + '…'}
                    {req.term ? ` · ${req.term} months` : ''}
                    {' · '}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-300 text-sm line-clamp-2">{req.purpose}</p>
                </div>
                {(req.status === 'PENDING' || req.status === 'UNDER_REVIEW' || req.status === 'APPROVED') && (
                  <button
                    onClick={() => {
                      setSelected(req);
                      setReviewStatus('UNDER_REVIEW');
                      setAdminNotes(req.adminNotes ?? '');
                      setVaultId(req.vaultId ?? '');
                      setReviewError(null);
                    }}
                    className="btn-primary text-sm ml-4 flex-shrink-0"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1219] border border-gray-800/50 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-1">Review Funding Request</h3>
            <p className="text-gray-400 text-sm mb-6">
              {selected.amount.toLocaleString()} {selected.currency}
              {selected.term ? ` · ${selected.term} months` : ''}
              {' — '}
              {selected.user.businessProfile?.companyName ?? selected.user.walletAddress.slice(0, 12)}
            </p>

            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Decision</label>
                <select
                  value={reviewStatus}
                  onChange={e => setReviewStatus(e.target.value as typeof reviewStatus)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="UNDER_REVIEW">Mark Under Review</option>
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                </select>
              </div>

              {reviewStatus === 'APPROVED' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Vault ID (optional)</label>
                  <input
                    type="text"
                    value={vaultId}
                    onChange={e => setVaultId(e.target.value)}
                    placeholder="Vault contract address or ID"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={reviewing}
                  className={`flex-1 btn-primary flex items-center justify-center gap-2 ${
                    reviewStatus === 'APPROVED' ? '' : reviewStatus === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : ''
                  }`}
                >
                  {reviewing ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : reviewStatus === 'APPROVED' ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : reviewStatus === 'REJECTED' ? (
                    <XCircleIcon className="w-4 h-4" />
                  ) : (
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  )}
                  {reviewing ? 'Saving…' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
