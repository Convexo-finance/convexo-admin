'use client';

import { useState, useEffect } from 'react';
import { useChainId, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl } from '@/lib/contracts/addresses';
import { VeriffVerifierABI, SumsubVerifierABI } from '@/lib/contracts/abis';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type VerificationType = 'veriff' | 'sumsub';

interface PendingVerification {
  address: string;
  sessionId: string;
  submittedAt: number;
  type: VerificationType;
  chainId: number;
}

export function VerificationSystems() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [verificationType, setVerificationType] = useState<VerificationType>('veriff');
  const [userAddress, setUserAddress] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [selectedForAction, setSelectedForAction] = useState<string | null>(null);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const { writeContract, data: hash, isPending, error: writeError } = useConvexoWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Load pending verifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pending_verifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter for current network and valid entries
        const filtered = parsed.filter((v: PendingVerification) => v.chainId === chainId);
        setPendingVerifications(filtered);
      } catch (e) {
        console.error('Failed to parse pending verifications:', e);
      }
    }
  }, [chainId]);

  // Save pending verifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pending_verifications', JSON.stringify(pendingVerifications));
  }, [pendingVerifications]);

  // Auto-add submitted verification to pending list
  useEffect(() => {
    if (isSuccess && userAddress && sessionId) {
      const newVerification: PendingVerification = {
        address: userAddress,
        sessionId: sessionId,
        submittedAt: Date.now(),
        type: verificationType,
        chainId: chainId,
      };
      setPendingVerifications((prev) => [newVerification, ...prev]);
      setUserAddress('');
      setSessionId('');
    }
  }, [isSuccess, userAddress, sessionId, verificationType, chainId]);

  // Veriff status lookup
  const { data: veriffStatus, refetch: refetchVeriff } = useReadContract({
    address: contracts?.VERIFF_VERIFIER,
    abi: VeriffVerifierABI,
    functionName: 'getVerificationStatus',
    args: lookupAddress ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: !!lookupAddress && lookupAddress.startsWith('0x') && verificationType === 'veriff' },
  });

  // Sumsub status lookup
  const { data: sumsubStatus, refetch: refetchSumsub } = useReadContract({
    address: contracts?.SUMSUB_VERIFIER,
    abi: SumsubVerifierABI,
    functionName: 'getVerificationStatus',
    args: lookupAddress ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: !!lookupAddress && lookupAddress.startsWith('0x') && verificationType === 'sumsub' },
  });

  const currentContract = verificationType === 'veriff' ? contracts?.VERIFF_VERIFIER : contracts?.SUMSUB_VERIFIER;
  const currentABI = verificationType === 'veriff' ? VeriffVerifierABI : SumsubVerifierABI;

  const handleSubmit = () => {
    if (!userAddress || !sessionId || !currentContract) {
      alert('Please fill in user address and session ID');
      return;
    }

    writeContract({
      address: currentContract as `0x${string}`,
      abi: currentABI,
      functionName: 'submitVerification',
      args: [userAddress as `0x${string}`, sessionId],
    });
  };

  const handleApprove = () => {
    if (!userAddress || !currentContract) {
      alert('Please fill in user address');
      return;
    }

    writeContract({
      address: currentContract as `0x${string}`,
      abi: currentABI,
      functionName: 'approveVerification',
      args: [userAddress as `0x${string}`],
    });
  };

  const handleReject = () => {
    if (!userAddress || !rejectReason || !currentContract) {
      alert('Please fill in user address and rejection reason');
      return;
    }

    writeContract({
      address: currentContract as `0x${string}`,
      abi: currentABI,
      functionName: 'rejectVerification',
      args: [userAddress as `0x${string}`, rejectReason],
    });
  };

  const handleReset = () => {
    if (!userAddress || !currentContract) {
      alert('Please fill in user address');
      return;
    }

    writeContract({
      address: currentContract as `0x${string}`,
      abi: currentABI,
      functionName: 'resetVerification',
      args: [userAddress as `0x${string}`],
    });
  };

  const handleLookup = () => {
    if (verificationType === 'veriff') {
      refetchVeriff();
    } else {
      refetchSumsub();
    }
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

  const currentStatus = verificationType === 'veriff' ? veriffStatus : sumsubStatus;
  const statusInfo = currentStatus && Array.isArray(currentStatus) ? getStatusInfo(Number(currentStatus[0])) : null;
  const StatusIcon = statusInfo?.icon;

  // Get pending verifications for current type
  const pendingForType = pendingVerifications.filter((v) => v.type === verificationType);

  // Remove a pending verification from the list
  const handleRemovePending = (verification: PendingVerification) => {
    setPendingVerifications((prev) => prev.filter((v) => v.address !== verification.address));
  };

  // Select pending verification for quick action
  const handleSelectPending = (verification: PendingVerification) => {
    setLookupAddress(verification.address);
    setUserAddress(verification.address);
    setSessionId(verification.sessionId);
  };

  return (
    <div className="space-y-8">
      {/* Main Tabs - Select Verification Type */}
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setVerificationType('veriff')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            verificationType === 'veriff'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Veriff KYC (LP Individuals)
          </span>
        </button>

        <button
          onClick={() => setVerificationType('sumsub')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            verificationType === 'sumsub'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Sumsub KYB (LP Business)
          </span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Pending List & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pending Verifications List */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Pending</h3>
              </div>
              <span className="text-sm bg-amber-900/40 text-amber-300 px-2 py-1 rounded-full font-medium">
                {pendingForType.length}
              </span>
            </div>

            {pendingForType.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending submissions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingForType.map((verification) => (
                  <PendingVerificationRow
                    key={`${verification.address}-${verification.submittedAt}`}
                    verification={verification}
                    verificationType={verificationType}
                    onSelect={handleSelectPending}
                    onRemove={handleRemovePending}
                    contracts={contracts}
                    abi={verificationType === 'veriff' ? VeriffVerifierABI : SumsubVerifierABI}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Lookup & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Lookup Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Verification Details</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enter an address to view verification status and take action
            </p>

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
                    className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  />
                  <button
                    onClick={handleLookup}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
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
                    <span className="text-gray-400 font-medium">Current Status</span>
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
              <label className="text-xs text-gray-400 mb-2 block">Rejection Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full p-2 mb-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-xs focus:border-red-500 focus:outline-none resize-none h-16"
              />
              <button
                onClick={handleReject}
                disabled={!userAddress || isPending || isConfirming}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Submit New Section */}
      <div className="card p-6 border-t-2 border-gray-700 mt-8 pt-8">
        <h3 className="text-lg font-semibold text-white mb-4">Submit New Verification</h3>
        <p className="text-sm text-gray-400 mb-4">
          Manually record a verification submission from {verificationType === 'veriff' ? 'Veriff' : 'Sumsub'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">User Address</label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session_..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!userAddress || !sessionId || isPending || isConfirming}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <ClockIcon className="w-4 h-4" />
          {isPending || isConfirming ? 'Submitting...' : 'Submit Verification'}
        </button>
      </div>

      {/* Transaction Status */}
      <div className="space-y-3">
        {writeError ? (
          <div className="card p-4 bg-red-900/20 border-red-700/50">
            <p className="text-red-400 text-sm font-medium">Error occurred:</p>
            <p className="text-red-300 text-sm mt-1">{writeError.message}</p>
          </div>
        ) : null}

        {isSuccess && hash ? (
          <div className="card p-4 bg-emerald-900/20 border-emerald-700/50">
            <p className="text-emerald-400 text-sm font-medium mb-2">✓ Transaction successful!</p>
            <a
              href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-emerald-200 text-sm underline inline-flex items-center gap-1"
            >
              View on Block Explorer →
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// PendingVerificationRow component
interface PendingVerificationRowProps {
  verification: PendingVerification;
  verificationType: VerificationType;
  onSelect: (verification: PendingVerification) => void;
  onRemove: (verification: PendingVerification) => void;
  contracts: ReturnType<typeof getContractsForChain>;
  abi: any;
}

function PendingVerificationRow({
  verification,
  verificationType,
  onSelect,
  onRemove,
  contracts,
  abi,
}: PendingVerificationRowProps) {
  const chainId = useChainId();
  const [status, setStatus] = useState<string>('pending');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const contractAddress = verificationType === 'veriff' ? contracts?.VERIFF_VERIFIER : contracts?.SUMSUB_VERIFIER;

  // Fetch verification status for this address
  const { data: statusData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'verificationStatus',
    args: [verification.address],
    query: {
      enabled: !!contractAddress,
    },
  });

  useEffect(() => {
    if (statusData !== undefined) {
      const statusNum = typeof statusData === 'bigint' ? statusData.toString() : String(statusData);
      if (statusNum === '0') setStatus('not-started');
      else if (statusNum === '1') setStatus('pending');
      else if (statusNum === '2') setStatus('approved');
      else if (statusNum === '3') setStatus('rejected');
      setIsLoadingStatus(false);
    }
  }, [statusData]);

  const getStatusBadge = () => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      'not-started': { bg: 'bg-gray-700', text: 'Not Started', icon: null },
      'pending': { bg: 'bg-amber-700', text: 'Pending', icon: <ClockIcon className="w-4 h-4" /> },
      'approved': { bg: 'bg-green-700', text: 'Approved', icon: <CheckCircleIcon className="w-4 h-4" /> },
      'rejected': { bg: 'bg-red-700', text: 'Rejected', icon: <XCircleIcon className="w-4 h-4" /> },
    };

    const badge = badges[status];
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} text-white`}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-900/70 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-mono text-gray-300 truncate">{verification.address}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Session: {verification.sessionId.slice(0, 8)}...</span>
              <span className="text-xs text-gray-600">• {formatDate(verification.submittedAt)}</span>
            </div>
          </div>
          <div>{isLoadingStatus ? <div className="text-xs text-gray-500">Loading...</div> : getStatusBadge()}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelect(verification)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
          title="Click to populate lookup fields"
        >
          Select
        </button>
        <button
          onClick={() => onRemove(verification)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-red-400 rounded-lg transition"
          title="Remove from pending list"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
