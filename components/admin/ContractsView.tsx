'use client';

import { useState } from 'react';
import { useChainId, useReadContract } from 'wagmi';
import { getContractsForChain } from '@/lib/contracts/addresses';
import { ContractSignerABI } from '@/lib/contracts/abis';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export function ContractsView() {
  const chainId = useChainId();
  const contracts = getContractsForChain(chainId);

  const [lookupHash, setLookupHash] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Get total contract count
  const { data: contractCount } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'getContractCount',
  });

  // Get contract hashes for current page
  const contractIndices = Array.from(
    { length: Math.min(ITEMS_PER_PAGE, Number(contractCount || 0) - currentPage * ITEMS_PER_PAGE) },
    (_, i) => currentPage * ITEMS_PER_PAGE + i
  );

  // Lookup specific contract by hash
  const { data: lookupContract, refetch: refetchLookup } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'getContract',
    args: lookupHash && lookupHash.startsWith('0x') ? [lookupHash as `0x${string}`] : undefined,
    query: { enabled: !!lookupHash && lookupHash.startsWith('0x') },
  });

  // Check if contract is fully signed
  const { data: isFullySigned } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'isFullySigned',
    args: lookupHash && lookupHash.startsWith('0x') ? [lookupHash as `0x${string}`] : undefined,
    query: { enabled: !!lookupHash && lookupHash.startsWith('0x') },
  });

  const handleLookup = () => {
    if (lookupHash && lookupHash.startsWith('0x')) {
      refetchLookup();
    }
  };

  const getAgreementTypeName = (type: number) => {
    const types = ['Vault Funding', 'General Agreement', 'Loan Agreement', 'Service Agreement', 'Other'];
    return types[type] || 'Unknown';
  };

  const getTierName = (tier: number) => {
    const tiers = ['None', 'Passport (Tier 1)', 'Limited Partner (Tier 2)', 'Vault Creator (Tier 3)'];
    return tiers[tier] || 'Unknown';
  };

  const getStatusColor = (contract: any) => {
    if (!contract) return 'gray';
    if (Array.isArray(contract) && contract[5]) return 'red'; // isCancelled
    if (Array.isArray(contract) && contract[4]) return 'emerald'; // isExecuted
    if (isFullySigned) return 'amber'; // Fully signed but not executed
    return 'blue'; // Pending signatures
  };

  const getStatusLabel = (contract: any) => {
    if (!contract) return 'Not Found';
    if (Array.isArray(contract) && contract[6]) return 'Cancelled';
    if (Array.isArray(contract) && contract[5]) return 'Executed';
    if (isFullySigned) return 'Fully Signed';
    return 'Pending Signatures';
  };

  const contractData = Array.isArray(lookupContract) ? lookupContract : null;
  const statusColor = getStatusColor(contractData);
  const statusLabel = getStatusLabel(contractData);

  const totalPages = Math.ceil(Number(contractCount || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Contracts</p>
              <p className="text-2xl font-bold text-white mt-1">
                {contractCount?.toString() || '0'}
              </p>
            </div>
            <DocumentTextIcon className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Contract Signer</p>
              <p className="text-xs font-mono text-white mt-1 break-all">
                {contracts?.CONTRACT_SIGNER ?
                  `${contracts.CONTRACT_SIGNER.slice(0, 10)}...${contracts.CONTRACT_SIGNER.slice(-8)}` :
                  'N/A'}
              </p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-emerald-400 opacity-50" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Min Required Tier</p>
              <p className="text-lg font-semibold text-white mt-1">
                Passport (Tier 1+)
              </p>
            </div>
            <ClockIcon className="w-12 h-12 text-amber-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Contract Lookup */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Lookup Contract</h3>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={lookupHash}
            onChange={(e) => setLookupHash(e.target.value)}
            placeholder="0x... document hash"
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:border-purple-500 focus:outline-none"
          />
          <button onClick={handleLookup} className="btn-primary flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Lookup
          </button>
        </div>

        {contractData ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${statusColor}-900/20 border border-${statusColor}-700/50`}>
              {statusLabel === 'Executed' ? (
                <CheckCircleIcon className={`w-5 h-5 text-${statusColor}-400`} />
              ) : statusLabel === 'Cancelled' ? (
                <XMarkIcon className={`w-5 h-5 text-${statusColor}-400`} />
              ) : (
                <ClockIcon className={`w-5 h-5 text-${statusColor}-400`} />
              )}
              <span className={`text-${statusColor}-400 font-medium`}>{statusLabel}</span>
            </div>

            {/* Contract Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Document Hash</span>
                <span className="text-white font-mono text-xs break-all">{contractData[0]}</span>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Agreement Type</span>
                <span className="text-white font-medium">{getAgreementTypeName(Number(contractData[1]))}</span>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Initiator</span>
                <span className="text-white font-mono text-xs">{contractData[2]}</span>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Required Tier</span>
                <span className="text-purple-400 font-medium">{getTierName(Number(contractData[8]))}</span>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Created At</span>
                <span className="text-white text-sm">
                  {contractData[3] && Number(contractData[3]) > 0
                    ? new Date(Number(contractData[3]) * 1000).toLocaleString()
                    : 'N/A'}
                </span>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <span className="text-gray-400 text-sm block mb-1">Expires At</span>
                <span className="text-white text-sm">
                  {contractData[4] && Number(contractData[4]) > 0
                    ? new Date(Number(contractData[4]) * 1000).toLocaleString()
                    : 'No expiry'}
                </span>
              </div>

              {contractData[9] && Number(contractData[9]) > 0 ? (
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400 text-sm block mb-1">Vault ID</span>
                  <span className="text-cyan-400 font-medium">#{contractData[9]?.toString()}</span>
                </div>
              ) : null}

              {contractData[7] ? (
                <div className="p-4 bg-gray-800/50 rounded-lg col-span-full">
                  <span className="text-gray-400 text-sm block mb-1">IPFS Document</span>
                  <a
                    href={`https://ipfs.io/ipfs/${contractData[7]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline font-mono text-xs break-all"
                  >
                    {contractData[7]}
                  </a>
                </div>
              ) : null}
            </div>

            {/* Status Flags */}
            <div className="flex gap-3 flex-wrap">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isFullySigned ? 'bg-emerald-900/20 text-emerald-400' : 'bg-amber-900/20 text-amber-400'
              }`}>
                {isFullySigned ? '✓ Fully Signed' : '○ Pending Signatures'}
              </div>
              {contractData[5] ? (
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/20 text-emerald-400">
                  ✓ Executed
                </div>
              ) : null}
              {contractData[6] ? (
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400">
                  ✗ Cancelled
                </div>
              ) : null}
            </div>
          </div>
        ) : lookupHash && lookupHash.startsWith('0x') ? (
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-center">Contract not found or invalid hash</p>
          </div>
        ) : null}
      </div>

      {/* Contract List with Pagination */}
      {contractCount && Number(contractCount) > 0 ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">All Contracts</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-white" />
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {contractIndices.map((index) => (
              <ContractListItem key={index} index={index} contracts={contracts} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Info Card */}
      <div className="card p-6 bg-blue-900/10 border-blue-700/30">
        <h3 className="text-lg font-semibold text-white mb-3">About E-Contracts</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong>E-Contracts</strong> are on-chain digital agreements that require multi-party signatures.
          </p>
          <p>
            <strong>Access:</strong> Viewing contracts requires Tier 1 (Convexo Passport) or above.
          </p>
          <p>
            <strong>Signing:</strong> Only required signers can sign contracts. Once all signatures are collected,
            the contract can be executed.
          </p>
          <p>
            <strong>Vault Integration:</strong> Vault funding contracts automatically link to vault IDs for
            fund release after full execution.
          </p>
        </div>
      </div>
    </div>
  );
}

// Contract list item component
function ContractListItem({ index, contracts }: { index: number; contracts: any }) {
  const { data: documentHash } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'getDocumentHashAtIndex',
    args: [BigInt(index)],
  });

  const { data: contractData } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'getContract',
    args: documentHash ? [documentHash as `0x${string}`] : undefined,
    query: { enabled: !!documentHash },
  });

  const { data: isFullySigned } = useReadContract({
    address: contracts?.CONTRACT_SIGNER,
    abi: ContractSignerABI,
    functionName: 'isFullySigned',
    args: documentHash ? [documentHash as `0x${string}`] : undefined,
    query: { enabled: !!documentHash },
  });

  if (!contractData || !Array.isArray(contractData)) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  const getAgreementTypeName = (type: number) => {
    const types = ['Vault Funding', 'General Agreement', 'Loan Agreement', 'Service Agreement', 'Other'];
    return types[type] || 'Unknown';
  };

  const statusColor = contractData[6] ? 'red' : contractData[5] ? 'emerald' : isFullySigned ? 'amber' : 'blue';
  const statusLabel = contractData[6] ? 'Cancelled' : contractData[5] ? 'Executed' : isFullySigned ? 'Signed' : 'Pending';

  return (
    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-white font-mono text-xs truncate">
              {documentHash?.toString().slice(0, 20)}...{documentHash?.toString().slice(-10)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-900/20 text-${statusColor}-400`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{getAgreementTypeName(Number(contractData[1]))}</span>
            <span>•</span>
            <span>
              {contractData[3] && Number(contractData[3]) > 0
                ? new Date(Number(contractData[3]) * 1000).toLocaleDateString()
                : 'N/A'}
            </span>
            {contractData[9] && Number(contractData[9]) > 0 ? (
              <>
                <span>•</span>
                <span className="text-cyan-400">Vault #{contractData[9]?.toString()}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
