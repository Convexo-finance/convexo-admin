'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChainId, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl } from '@/lib/contracts/addresses';
import { VeriffVerifierABI } from '@/lib/contracts/abis';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import { apiFetch, ApiError } from '@/lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface BackendVerification {
  id: string;
  userId: string;
  type: string;
  status: string;
  provider?: string;
  sessionId?: string;
  nftTokenId?: string;
  processedAt?: string;
  createdAt: string;
  user: {
    walletAddress: string;
    accountType?: string;
    individualProfile?: { firstName: string; lastName: string; email?: string } | null;
  };
}

interface VerificationsListResponse {
  items: BackendVerification[];
  total: number;
}

export function VeriffVerificationSystem() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [userAddress, setUserAddress] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [selectedForAction, setSelectedForAction] = useState<string | null>(null);

  // Backend pending verifications (replaces localStorage)
  const [pendingVerifications, setPendingVerifications] = useState<BackendVerification[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState('');

  const { writeContract, data: hash, isPending, error: writeError } = useConvexoWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Load pending Veriff verifications from backend
  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    setPendingError('');
    try {
      const data = await apiFetch<VerificationsListResponse>(
        '/admin/verifications?type=VERIFF&status=PENDING&limit=50',
      );
      setPendingVerifications(data.items ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode !== 401) {
        setPendingError(err.message);
      }
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Refresh pending list after successful on-chain action
  useEffect(() => {
    if (isSuccess) {
      loadPending();
      setUserAddress('');
      setSessionId('');
    }
  }, [isSuccess, loadPending]);

  // Veriff status lookup
  const { data: veriffStatus, refetch: refetchVeriff } = useReadContract({
    address: contracts?.VERIFF_VERIFIER,
    abi: VeriffVerifierABI,
    functionName: 'getVerificationStatus',
    args: lookupAddress ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: !!lookupAddress && lookupAddress.startsWith('0x') },
  });

  const handleSubmit = () => {
    if (!userAddress || !sessionId || !contracts?.VERIFF_VERIFIER) {
      alert('Please fill in user address and session ID');
      return;
    }

    writeContract({
      address: contracts.VERIFF_VERIFIER as `0x${string}`,
      abi: VeriffVerifierABI,
      functionName: 'submitVerification',
      args: [userAddress as `0x${string}`, sessionId],
    });
  };

  const handleApprove = () => {
    if (!userAddress || !contracts?.VERIFF_VERIFIER) {
      alert('Please fill in user address');
      return;
    }

    writeContract({
      address: contracts.VERIFF_VERIFIER as `0x${string}`,
      abi: VeriffVerifierABI,
      functionName: 'approveVerification',
      args: [userAddress as `0x${string}`],
    });
  };

  const handleReject = () => {
    if (!userAddress || !rejectReason || !contracts?.VERIFF_VERIFIER) {
      alert('Please fill in user address and rejection reason');
      return;
    }

    writeContract({
      address: contracts.VERIFF_VERIFIER as `0x${string}`,
      abi: VeriffVerifierABI,
      functionName: 'rejectVerification',
      args: [userAddress as `0x${string}`, rejectReason],
    });
  };

  const handleReset = () => {
    if (!userAddress || !contracts?.VERIFF_VERIFIER) {
      alert('Please fill in user address');
      return;
    }

    writeContract({
      address: contracts.VERIFF_VERIFIER as `0x${string}`,
      abi: VeriffVerifierABI,
      functionName: 'resetVerification',
      args: [userAddress as `0x${string}`],
    });
  };

  const handleLookup = () => {
    refetchVeriff();
  };

  const getStatusInfo = (status: number) => {
    const statuses = [
      { label: 'Not Submitted', color: 'gray', icon: ClockIcon },
      { label: 'Pending', color: 'amber', icon: ClockIcon },
      { label: 'Approved', color: 'emerald', icon: CheckCircleIcon },
      { label: 'Rejected', color: 'red', icon: XCircleIcon },
    ];
    return statuses[status] || statuses[0];
  };

  const currentStatus = veriffStatus;
  const statusInfo = currentStatus && Array.isArray(currentStatus) ? getStatusInfo(Number(currentStatus[0])) : null;
  const StatusIcon = statusInfo?.icon;

  const handleSelectPending = (verification: BackendVerification) => {
    setLookupAddress(verification.user.walletAddress);
    setUserAddress(verification.user.walletAddress);
    setSessionId(verification.sessionId ?? '');
    setSelectedForAction(verification.id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Veriff KYC - Individual Verification
        </h2>
        <p className="text-gray-400">Manage Veriff KYC submissions for LP_Individuals NFT</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Pending List from Backend */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Pending Veriff</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-amber-900/40 text-amber-300 px-2 py-1 rounded-full font-medium">
                  {pendingVerifications.length}
                </span>
                <button
                  onClick={loadPending}
                  disabled={loadingPending}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loadingPending ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {pendingError && <p className="text-red-400 text-xs mb-3">{pendingError}</p>}

            {loadingPending ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pendingVerifications.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending submissions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingVerifications.map((verification) => (
                  <div
                    key={verification.id}
                    className={`flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-slate-900/70 transition cursor-pointer ${
                      selectedForAction === verification.id
                        ? 'border-blue-500 bg-blue-900/10'
                        : 'bg-slate-900/50 border-slate-700/50'
                    }`}
                    onClick={() => handleSelectPending(verification)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-300 truncate">
                        {verification.user.walletAddress}
                      </p>
                      {verification.user.individualProfile && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {verification.user.individualProfile.firstName}{' '}
                          {verification.user.individualProfile.lastName}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(verification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectPending(verification); }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition whitespace-nowrap"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lookup Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Check Status</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">User Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupAddress || userAddress}
                    onChange={(e) => {
                      setLookupAddress(e.target.value);
                      setUserAddress(e.target.value);
                    }}
                    placeholder="0x1234567890abcdef..."
                    className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  />
                  <button
                    onClick={handleLookup}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center gap-2"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Check
                  </button>
                </div>
              </div>

              {/* Status Display */}
              {statusInfo && currentStatus && Array.isArray(currentStatus) && StatusIcon ? (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-400 font-medium">Status</span>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 text-${statusInfo.color}-400`} />
                      <span className={`text-${statusInfo.color}-400 font-bold`}>{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Session ID:</span>
                      <code className="bg-gray-900/50 px-2 py-1 rounded text-gray-300">{currentStatus[1] || 'N/A'}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Submitted:</span>
                      <span className="text-gray-300">
                        {currentStatus[2] && Number(currentStatus[2]) > 0
                          ? new Date(Number(currentStatus[2]) * 1000).toLocaleString()
                          : 'Not submitted'}
                      </span>
                    </div>
                    {currentStatus[3] ? (
                      <div className="pt-2 border-t border-gray-700">
                        <span className="text-red-400 text-xs block mb-1">Rejection Reason:</span>
                        <p className="text-red-300 italic">{currentStatus[3]}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Approve Button */}
            <button
              onClick={handleApprove}
              disabled={!userAddress || isPending || isConfirming}
              className="card p-4 text-center group hover:bg-emerald-900/20 hover:border-emerald-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircleIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-white text-sm">Approve</p>
              <p className="text-xs text-gray-400">Mint NFT</p>
            </button>

            {/* Reject Button */}
            <div className="card p-4">
              <label className="text-xs text-gray-400 mb-2 block">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full p-2 mb-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-xs focus:border-red-500 focus:outline-none resize-none h-16"
              />
              <button
                onClick={handleReject}
                disabled={!userAddress || isPending || isConfirming}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="w-4 h-4 inline mr-1" />
                Reject
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              disabled={!userAddress || isPending || isConfirming}
              className="card p-4 text-center group hover:bg-amber-900/20 hover:border-amber-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClockIcon className="w-6 h-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-white text-sm">Reset</p>
              <p className="text-xs text-gray-400">Allow resubmit</p>
            </button>
          </div>
        </div>
      </div>

      {/* Submit New Verification */}
      <div className="card p-6 border-t-2 border-gray-700 pt-8">
        <h3 className="text-lg font-semibold text-white mb-2">Submit New Veriff KYC</h3>
        <p className="text-sm text-gray-400 mb-6">Record a Veriff KYC submission with session ID</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">User Address</label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Veriff Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session_..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!userAddress || !sessionId || isPending || isConfirming}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center gap-2"
        >
          <ClockIcon className="w-4 h-4" />
          {isPending || isConfirming ? 'Submitting...' : 'Submit Veriff KYC'}
        </button>
      </div>

      {/* Status Messages */}
      <div className="space-y-3">
        {writeError ? (
          <div className="card p-4 bg-red-900/20 border-red-700/50">
            <p className="text-red-400 text-sm font-medium">Error:</p>
            <p className="text-red-300 text-sm mt-1">{writeError.message}</p>
          </div>
        ) : null}

        {isSuccess && hash ? (
          <div className="card p-4 bg-emerald-900/20 border-emerald-700/50">
            <p className="text-emerald-400 text-sm font-medium mb-2">✓ Success!</p>
            <a
              href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-emerald-200 text-sm underline"
            >
              View on Block Explorer →
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
