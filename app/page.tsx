'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useChainId } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { signInAdmin } from '@/lib/auth';
import { getToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect } = useConnect();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, redirect to dashboard
  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSignIn() {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      // Get the EIP-1193 provider from the connector
      const provider = await (window as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum;
      if (!provider) throw new Error('No injected wallet found');

      await signInAdmin(address, chainId, provider as Parameters<typeof signInAdmin>[2]);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="card text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Convexo Admin</h1>
          <p className="text-gray-400 mb-8 text-sm">
            Sign in with your admin wallet to access the control panel
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/50">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: metaMask() })}
              className="btn-primary w-full"
            >
              Connect MetaMask
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 justify-center">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-xs text-gray-300 font-mono">
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing…
                  </span>
                ) : (
                  'Sign In with Wallet'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
