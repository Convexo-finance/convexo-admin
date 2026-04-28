'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '@/lib/api';

interface BackendUser {
  id: string;
  walletAddress: string;
  email?: string;
  accountType?: string;
  createdAt: string;
  adminRole?: { role: string } | null;
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

const PAGE_LIMIT = 20;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:     'bg-amber-900/30 text-amber-300',
    IN_PROGRESS: 'bg-blue-900/30 text-blue-300',
    APPROVED:    'bg-emerald-900/30 text-emerald-300',
    REJECTED:    'bg-red-900/30 text-red-300',
    EXPIRED:     'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

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

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
                    {u.adminRole && (
                      <span className="text-xs bg-amber-900/30 text-amber-300 px-1.5 py-0.5 rounded">
                        {u.adminRole.role}
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
            <span className="text-sm text-gray-400">{page} / {totalPages}</span>
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

function AdminRolesPanel() {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'VERIFIER' | 'SUPER_ADMIN'>('VIEWER');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  const [revokeId, setRevokeId] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState('');

  const handleGrant = async () => {
    if (!userId.trim()) return;
    setGrantLoading(true);
    setGrantMsg('');
    try {
      await apiFetch('/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim(), role }),
      });
      setGrantMsg(`Role ${role} granted to user ${userId.trim()}.`);
      setUserId('');
    } catch (err: unknown) {
      setGrantMsg(`Error: ${(err as Error).message}`);
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId.trim()) return;
    setRevokeLoading(true);
    setRevokeMsg('');
    try {
      await apiFetch(`/admin/roles/${revokeId.trim()}`, { method: 'DELETE' });
      setRevokeMsg(`Admin role revoked for user ${revokeId.trim()}.`);
      setRevokeId('');
    } catch (err: unknown) {
      setRevokeMsg(`Error: ${(err as Error).message}`);
    } finally {
      setRevokeLoading(false);
    }
  };

  return (
    <div className="card p-6 border-amber-700/20 space-y-6">
      <h3 className="text-base font-semibold text-white flex items-center gap-2">
        <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
        Admin Roles
        <span className="text-xs text-gray-500 font-normal ml-1">(SUPER_ADMIN only)</span>
      </h3>

      {/* Grant */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Grant Role</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (from user list above)"
            className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-amber-500 focus:outline-none font-mono"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'VIEWER' | 'VERIFIER' | 'SUPER_ADMIN')}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="VIEWER">VIEWER</option>
            <option value="VERIFIER">VERIFIER</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <button
            onClick={handleGrant}
            disabled={grantLoading || !userId.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {grantLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
            Grant
          </button>
        </div>
        {grantMsg && (
          <p className={`text-xs ${grantMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{grantMsg}</p>
        )}
        <p className="text-xs text-gray-600">Role hierarchy: VIEWER (read-only) &lt; VERIFIER (approve/reject) &lt; SUPER_ADMIN (full access)</p>
      </div>

      {/* Revoke */}
      <div className="space-y-3 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Revoke Role</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={revokeId}
            onChange={(e) => setRevokeId(e.target.value)}
            placeholder="User ID to revoke"
            className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-red-500 focus:outline-none font-mono"
          />
          <button
            onClick={handleRevoke}
            disabled={revokeLoading || !revokeId.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {revokeLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <XCircleIcon className="w-4 h-4" />}
            Revoke
          </button>
        </div>
        {revokeMsg && (
          <p className={`text-xs ${revokeMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{revokeMsg}</p>
        )}
      </div>
    </div>
  );
}

export function UserManagement() {
  return (
    <div className="space-y-6">
      <BackendUserPanel />
      <AdminRolesPanel />
    </div>
  );
}
