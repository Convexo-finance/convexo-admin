'use client';

import { useState, useEffect } from 'react';
import { useChainId, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { getContractsForChain, getBlockExplorerUrl } from '@/lib/contracts/addresses';
import { LPIndividualsABI, LPBusinessABI } from '@/lib/contracts/abis';
import { createLPIndividualMetadata, createLPBusinessMetadata, uploadMetadataToPinata } from '@/lib/config/pinata';
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite';
import {
  CheckCircleIcon,
  XCircleIcon,
  FireIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface NFTAdminProps {
  type: 'lpIndividuals' | 'lpBusiness';
}

export function NFTAdminPanel({ type }: NFTAdminProps) {
  const chainId = useChainId();
  const { address: adminAddress } = useAccount();
  const contracts = getContractsForChain(chainId);

  const [userAddress, setUserAddress] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [tokenIdToBurn, setTokenIdToBurn] = useState('');
  const [tokenIdToToggle, setTokenIdToToggle] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [isUploadingMetadata, setIsUploadingMetadata] = useState(false);
  const [metadataHash, setMetadataHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { writeContract, data: hash, isPending, error: writeError, reset } = useConvexoWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const contractAddress = type === 'lpIndividuals' 
    ? contracts?.LP_INDIVIDUALS 
    : contracts?.LP_BUSINESS;
  
  const contractABI = type === 'lpIndividuals' ? LPIndividualsABI : LPBusinessABI;
  const title = type === 'lpIndividuals' ? 'LP Individuals' : 'LP Business';
  const gradientColor = type === 'lpIndividuals' ? 'blue' : 'purple';

  // Get total supply for next token ID estimation
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalSupply',
    query: { enabled: !!contractAddress },
  });

  // Check balance for lookup address
  const { data: balanceOf, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'balanceOf',
    args: lookupAddress ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: !!lookupAddress && lookupAddress.startsWith('0x') },
  });

  // Parse balance as bigint
  const balanceAsBigInt = typeof balanceOf === 'bigint' ? balanceOf : undefined;

  // Get token ID by owner (first token)
  const { data: tokenIdOfOwner } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'tokenOfOwnerByIndex',
    args: lookupAddress && balanceAsBigInt && balanceAsBigInt > 0n 
      ? [lookupAddress as `0x${string}`, BigInt(0)] 
      : undefined,
    query: { enabled: !!lookupAddress && !!balanceAsBigInt && balanceAsBigInt > 0n },
  });

  // Get token state (active/inactive)
  const { data: tokenState, refetch: refetchTokenState } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getTokenState',
    args: tokenIdOfOwner !== undefined ? [tokenIdOfOwner] : undefined,
    query: { enabled: tokenIdOfOwner !== undefined },
  });

  // Get token URI
  const { data: tokenURI } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'tokenURI',
    args: tokenIdOfOwner !== undefined ? [tokenIdOfOwner] : undefined,
    query: { enabled: tokenIdOfOwner !== undefined },
  });

  // Check if admin has MINTER_ROLE
  const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
  const { data: hasMinteRole } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'hasRole',
    args: adminAddress ? [MINTER_ROLE, adminAddress] : undefined,
    query: { enabled: !!adminAddress && !!contractAddress },
  });

  // Reset success/error on chain change
  useEffect(() => {
    setSuccess('');
    setError('');
    reset();
  }, [chainId, reset]);

  // Handle success
  useEffect(() => {
    if (isSuccess && hash) {
      setSuccess(`Transaction successful! Hash: ${hash}`);
      setUserAddress('');
      setVerificationId('');
      setTokenIdToBurn('');
      setTokenIdToToggle('');
      setMetadataHash('');
      refetchSupply();
      if (lookupAddress) {
        refetchBalance();
        refetchTokenState();
      }
    }
  }, [isSuccess, hash, refetchSupply, refetchBalance, refetchTokenState, lookupAddress]);

  // Generate and upload metadata to Pinata
  const handleGenerateMetadata = async () => {
    setIsUploadingMetadata(true);
    setError('');
    
    try {
      const nextTokenId = totalSupply ? Number(totalSupply) + 1 : 1;
      
      const metadata = type === 'lpIndividuals'
        ? createLPIndividualMetadata(nextTokenId, 'Enhanced')
        : createLPBusinessMetadata(nextTokenId, 'Enhanced');
      
      console.log('📤 Uploading metadata to Pinata:', metadata);
      const ipfsHash = await uploadMetadataToPinata(metadata as any);
      
      setMetadataHash(ipfsHash);
      setSuccess(`Metadata uploaded! IPFS Hash: ${ipfsHash}`);
    } catch (err: any) {
      console.error('Metadata upload error:', err);
      setError(`Failed to upload metadata: ${err.message}`);
    } finally {
      setIsUploadingMetadata(false);
    }
  };

  // Mint NFT with metadata URI
  const handleMint = () => {
    if (!userAddress || !verificationId || !metadataHash || !contractAddress) {
      setError('Please fill in all fields and generate metadata first');
      return;
    }

    setError('');
    const uri = `ipfs://${metadataHash}`;
    
    console.log('🔐 Minting NFT:', { to: userAddress, verificationId, uri });
    
    writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'safeMint',
      args: [userAddress as `0x${string}`, verificationId, uri],
    });
  };

  // Burn NFT
  const handleBurn = () => {
    if (!tokenIdToBurn || !contractAddress) {
      setError('Please enter a token ID to burn');
      return;
    }

    setError('');
    
    writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'burn',
      args: [BigInt(tokenIdToBurn)],
    });
  };

  // Toggle token state (activate/deactivate)
  const handleToggleState = (newState: boolean) => {
    if (!tokenIdToToggle || !contractAddress) {
      setError('Please enter a token ID');
      return;
    }

    setError('');
    
    writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'setTokenState',
      args: [BigInt(tokenIdToToggle), newState],
    });
  };

  const handleLookup = () => {
    refetchBalance();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold text-white mb-2 flex items-center gap-3`}>
          <span className={`w-3 h-3 rounded-full bg-${gradientColor}-500`}></span>
          {title} NFT Management
        </h2>
        <p className="text-gray-400">Admin controls for {title} soulbound NFTs</p>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="text-gray-500">Contract: <code className="text-gray-400">{contractAddress?.slice(0, 10)}...{contractAddress?.slice(-8)}</code></span>
          <span className="text-gray-500">Total Supply: <span className="text-white font-medium">{totalSupply?.toString() || '0'}</span></span>
          {hasMinteRole !== undefined && (
            <span className={hasMinteRole ? 'text-emerald-400' : 'text-red-400'}>
              {hasMinteRole ? '✓ Has Minter Role' : '✗ No Minter Role'}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Mint NFT */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserPlusIcon className={`w-6 h-6 text-${gradientColor}-400`} />
              <h3 className="text-lg font-semibold text-white">Mint New NFT</h3>
            </div>

            <div className="space-y-4">
              {/* User Address */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Recipient Address</label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* Verification ID */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Verification ID (from Veriff/Sumsub)</label>
                <input
                  type="text"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value)}
                  placeholder="session_..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Metadata Generation */}
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300">NFT Metadata (IPFS)</span>
                  </div>
                  <button
                    onClick={handleGenerateMetadata}
                    disabled={isUploadingMetadata}
                    className={`px-3 py-1.5 bg-${gradientColor}-600 hover:bg-${gradientColor}-700 disabled:bg-gray-700 disabled:opacity-50 text-white text-sm rounded-lg transition flex items-center gap-2`}
                  >
                    {isUploadingMetadata ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>Generate & Upload</>
                    )}
                  </button>
                </div>
                
                {metadataHash ? (
                  <div className="p-2 bg-emerald-900/30 border border-emerald-700/50 rounded text-sm">
                    <span className="text-emerald-400">✓ IPFS Hash: </span>
                    <code className="text-emerald-300 break-all">{metadataHash}</code>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Click to generate metadata and upload to Pinata IPFS</p>
                )}
              </div>

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={!userAddress || !verificationId || !metadataHash || isPending || isConfirming}
                className={`w-full px-6 py-3 bg-gradient-to-r from-${gradientColor}-600 to-${gradientColor}-700 hover:from-${gradientColor}-700 hover:to-${gradientColor}-800 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2`}
              >
                <UserPlusIcon className="w-5 h-5" />
                {isPending || isConfirming ? 'Minting...' : `Mint ${title} NFT`}
              </button>
            </div>
          </div>

          {/* Burn NFT */}
          <div className="card p-6 border-red-900/30">
            <div className="flex items-center gap-3 mb-4">
              <FireIcon className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Burn NFT</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Token ID to Burn</label>
                <input
                  type="text"
                  value={tokenIdToBurn}
                  onChange={(e) => setTokenIdToBurn(e.target.value)}
                  placeholder="Enter token ID..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">
                    Warning: Burning is irreversible. The NFT will be permanently destroyed.
                  </p>
                </div>
              </div>

              <button
                onClick={handleBurn}
                disabled={!tokenIdToBurn || isPending || isConfirming}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <FireIcon className="w-5 h-5" />
                {isPending || isConfirming ? 'Burning...' : 'Burn NFT'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Lookup & State Management */}
        <div className="space-y-6">
          {/* Lookup Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <MagnifyingGlassIcon className={`w-6 h-6 text-${gradientColor}-400`} />
              <h3 className="text-lg font-semibold text-white">Lookup NFT Holder</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Wallet Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => setLookupAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  />
                  <button
                    onClick={handleLookup}
                    className={`px-6 py-3 bg-${gradientColor}-600 hover:bg-${gradientColor}-700 text-white rounded-lg transition font-medium flex items-center gap-2`}
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Check
                  </button>
                </div>
              </div>

              {/* Lookup Results */}
              {balanceAsBigInt !== undefined && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">NFT Balance</span>
                    <span className={`font-bold ${balanceAsBigInt > 0n ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {balanceAsBigInt.toString()}
                    </span>
                  </div>

                  {tokenIdOfOwner !== undefined && tokenIdOfOwner !== null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Token ID</span>
                        <span className="text-white font-mono">{String(tokenIdOfOwner)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className={tokenState ? 'text-emerald-400' : 'text-red-400'}>
                          {tokenState ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {tokenURI && (
                        <div className="pt-2 border-t border-gray-700">
                          <span className="text-gray-500 text-xs">Token URI:</span>
                          <p className="text-gray-300 text-sm break-all mt-1">{tokenURI as string}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Token State Management */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Toggle Token State</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Token ID</label>
                <input
                  type="text"
                  value={tokenIdToToggle}
                  onChange={(e) => setTokenIdToToggle(e.target.value)}
                  placeholder="Enter token ID..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleToggleState(true)}
                  disabled={!tokenIdToToggle || isPending || isConfirming}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Activate
                </button>
                <button
                  onClick={() => handleToggleState(false)}
                  disabled={!tokenIdToToggle || isPending || isConfirming}
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="w-5 h-5" />
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-3">
        {error && (
          <div className="card p-4 bg-red-900/20 border-red-700/50">
            <p className="text-red-400 text-sm font-medium">Error:</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {writeError && (
          <div className="card p-4 bg-red-900/20 border-red-700/50">
            <p className="text-red-400 text-sm font-medium">Transaction Error:</p>
            <p className="text-red-300 text-sm mt-1">{writeError.message}</p>
          </div>
        )}

        {success && (
          <div className="card p-4 bg-emerald-900/20 border-emerald-700/50">
            <p className="text-emerald-400 text-sm font-medium">✓ Success!</p>
            <p className="text-emerald-300 text-sm mt-1">{success}</p>
            {hash && (
              <a
                href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 hover:text-emerald-200 text-sm underline block mt-2"
              >
                View on Block Explorer →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
