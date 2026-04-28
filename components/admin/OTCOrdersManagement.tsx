'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { apiFetch, ApiError } from '@/lib/api';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type OrderType = 'BUY' | 'SELL';

interface OtcOrder {
  id: string;
  userId: string;
  orderId?: string | null;
  orderType: OrderType;
  status: OrderStatus;
  notes?: string | null;
  // fiat-OTC fields
  digitalAsset?: string | null;
  fiatCurrency?: string | null;
  assetAmount?: string | null;
  estimatedFiat?: string | null;
  rate?: string | null;
  walletAddress?: string | null;
  // sell bank info
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountType?: string | null;
  holderName?: string | null;
  // legacy swap fields
  tokenIn?: string | null;
  tokenOut?: string | null;
  amountIn?: string | null;
  amountOut?: string | null;
  createdAt: string;
  user: {
    walletAddress: string;
    individualProfile: { firstName: string; lastName: string; email?: string } | null;
    businessProfile: { companyName: string; email?: string } | null;
  };
}

interface ListResponse { items: OtcOrder[]; total: number }

const PAGE_LIMIT = 20;

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:     'bg-amber-900/30 text-amber-300',
  CONFIRMED:   'bg-blue-900/30 text-blue-300',
  IN_PROGRESS: 'bg-indigo-900/30 text-indigo-300',
  COMPLETED:   'bg-emerald-900/30 text-emerald-300',
  CANCELLED:   'bg-gray-800 text-gray-400',
};

const TYPE_STYLE: Record<OrderType, string> = {
  BUY:  'bg-emerald-900/30 text-emerald-300',
  SELL: 'bg-red-900/30 text-red-300',
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
};

function displayName(order: OtcOrder): string {
  const p = order.user.individualProfile;
  const b = order.user.businessProfile;
  if (p) return `${p.firstName} ${p.lastName}`;
  if (b) return b.companyName;
  return `${order.user.walletAddress.slice(0, 8)}…`;
}

function displayTrade(order: OtcOrder): string {
  if (order.digitalAsset) {
    const amt = order.assetAmount ?? '?';
    const fiat = order.estimatedFiat ? ` ≈ ${order.estimatedFiat} ${order.fiatCurrency ?? ''}` : '';
    return `${order.orderType} ${amt} ${order.digitalAsset}${fiat}`;
  }
  if (order.tokenIn) {
    return `${order.tokenIn} → ${order.tokenOut ?? '?'} (${order.amountIn ?? '?'})`;
  }
  return order.orderId ?? order.id;
}

export function OTCOrdersManagement() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('PENDING');
  const [orders, setOrders] = useState<OtcOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selected, setSelected] = useState<OtcOrder | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        offset: String((page - 1) * PAGE_LIMIT),
      });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<ListResponse>(`/admin/otc/orders?${params}`);
      setOrders(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const selectOrder = (order: OtcOrder) => {
    setSelected(order);
    setNotes(order.notes ?? '');
    setNewStatus('');
    setUpdateMsg('');
  };

  const handleUpdate = async () => {
    if (!selected || !newStatus) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      await apiFetch(`/admin/otc/orders/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, notes: notes.trim() || undefined }),
      });
      const updated: OtcOrder = { ...selected, status: newStatus, notes: notes.trim() || selected.notes };
      setSelected(updated);
      setOrders((prev) => prev.map((o) => o.id === selected.id ? updated : o));
      setUpdateMsg(`Status updated to ${newStatus}.`);
      setNewStatus('');
    } catch (err) {
      setUpdateMsg(`Error: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
          <ArrowsRightLeftIcon className="w-7 h-7 text-amber-400" />
          OTC Orders
        </h2>
        <p className="text-gray-400 text-sm">Manage cash-in and cash-out orders across all users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List column */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(['', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'bg-amber-600/20 text-amber-300 border-amber-600/40'
                    : 'text-gray-400 hover:text-white bg-gray-800/50 border-transparent'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} orders</span>
            <button onClick={fetchOrders} disabled={loading} className="p-1 text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {listError && <p className="text-red-400 text-xs">{listError}</p>}

          <div className="space-y-2">
            {loading
              ? [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)
              : orders.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">No orders found.</p>
              : orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected?.id === order.id
                        ? 'border-amber-500 bg-amber-900/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[order.orderType]}`}>
                            {order.orderType}
                          </span>
                          <p className="text-xs text-white truncate">{displayName(order)}</p>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{displayTrade(order)}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLE[order.status]}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
            }
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded bg-gray-800 border border-gray-700 disabled:opacity-50 hover:border-amber-500 transition-colors"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5 text-white" />
              </button>
              <span className="text-xs text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded bg-gray-800 border border-gray-700 disabled:opacity-50 hover:border-amber-500 transition-colors"
              >
                <ChevronRightIcon className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Detail column */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card p-10 text-center">
              <ArrowsRightLeftIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Select an order to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="card p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[selected.orderType]}`}>
                      {selected.orderType}
                    </span>
                    <p className="text-base font-semibold text-white">{displayName(selected)}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-400 break-all">{selected.user.walletAddress}</p>
                  {(selected.user.individualProfile?.email ?? selected.user.businessProfile?.email) && (
                    <p className="text-xs text-gray-500">
                      {selected.user.individualProfile?.email ?? selected.user.businessProfile?.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">Created {new Date(selected.createdAt).toLocaleString()}</p>
                  {selected.orderId && (
                    <p className="text-xs text-gray-500 font-mono">Order ID: {selected.orderId}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${STATUS_STYLE[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>

              {/* Trade details */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Order Details</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selected.digitalAsset && (
                    <>
                      <Detail label="Asset" value={selected.digitalAsset} />
                      <Detail label="Amount" value={selected.assetAmount ?? '—'} />
                      {selected.estimatedFiat && <Detail label="Estimated Fiat" value={`${selected.estimatedFiat} ${selected.fiatCurrency ?? ''}`} />}
                      {selected.rate && <Detail label="Rate" value={selected.rate} />}
                      {selected.fiatCurrency && <Detail label="Fiat Currency" value={selected.fiatCurrency} />}
                    </>
                  )}
                  {selected.tokenIn && (
                    <>
                      <Detail label="Token In" value={selected.tokenIn} />
                      <Detail label="Amount In" value={selected.amountIn ?? '—'} />
                      {selected.tokenOut && <Detail label="Token Out" value={selected.tokenOut} />}
                      {selected.amountOut && <Detail label="Amount Out" value={selected.amountOut} />}
                    </>
                  )}
                  {selected.walletAddress && <Detail label="Wallet" value={selected.walletAddress} mono />}
                  {selected.bankName && <Detail label="Bank" value={selected.bankName} />}
                  {selected.bankAccount && <Detail label="Account" value={selected.bankAccount} mono />}
                  {selected.bankAccountType && <Detail label="Account Type" value={selected.bankAccountType} />}
                  {selected.holderName && <Detail label="Holder" value={selected.holderName} />}
                </div>
                {selected.notes && (
                  <div className="mt-3 p-2 bg-gray-800/50 rounded">
                    <p className="text-xs text-gray-500 mb-0.5">Admin Notes</p>
                    <p className="text-xs text-gray-300">{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Status update */}
              {NEXT_STATUSES[selected.status] && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUSES[selected.status]!.map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewStatus(s === newStatus ? '' : s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          newStatus === s
                            ? `${STATUS_STYLE[s]} border-current`
                            : 'text-gray-400 bg-gray-800/50 border-transparent hover:text-white'
                        }`}
                      >
                        → {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a note for the user..."
                      maxLength={500}
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:border-amber-500 focus:outline-none resize-none h-16"
                    />
                  </div>

                  <button
                    onClick={handleUpdate}
                    disabled={updating || !newStatus}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {updating && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    {updating ? 'Saving...' : 'Save'}
                  </button>

                  {updateMsg && (
                    <p className={`text-sm ${updateMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {updateMsg}
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

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-2 bg-gray-800/50 rounded">
      <span className="text-gray-500 block mb-0.5">{label}</span>
      <span className={`text-gray-200 ${mono ? 'font-mono break-all' : ''}`}>{value}</span>
    </div>
  );
}
