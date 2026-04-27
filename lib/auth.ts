/**
 * Admin SIWE auth helpers.
 * Uses EOA wallet directly — no Account Kit, no smart accounts.
 * Pattern: connector.getProvider() → personal_sign (same as convexo_frontend useAuth.ts for EOA path)
 */

import { createSiweMessage } from 'viem/siwe';
import { apiFetch, clearTokens } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const JWT_KEY = 'convexo_admin_jwt';

interface UserPayload { id: string; walletAddress: string; accountType: string }

export async function signInAdmin(
  address: `0x${string}`,
  chainId: number,
  provider: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> },
): Promise<{ accessToken: string; user: UserPayload }> {
  // 1. Get nonce
  const nonceRes = await fetch(`${API_URL}/auth/nonce?address=${address}`);
  if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
  const nonceData = await nonceRes.json();
  const nonce: string = nonceData?.data?.nonce ?? nonceData?.nonce;
  if (!nonce) throw new Error('Invalid nonce response from server');

  // 2. Build SIWE message
  const message = createSiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in to Convexo Admin',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
  });

  // 3. Sign via EOA (personal_sign — never use wagmi signMessage)
  const signature = (await provider.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;

  // 4. Verify with backend
  const verifyRes = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, address, chainId, authMethod: 'METAMASK' }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.error ?? 'Sign-in failed');
  }

  const body = await verifyRes.json();
  const payload = body?.data ?? body;
  const { accessToken, refreshToken, user } = payload;

  if (!accessToken) throw new Error('No access token in verify response');

  localStorage.setItem(JWT_KEY, accessToken);
  localStorage.setItem('convexo_admin_refresh', refreshToken);

  return { accessToken, user };
}

export async function signOutAdmin(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {}
  clearTokens();
}
