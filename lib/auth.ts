/**
 * Admin SIWE auth helpers.
 * Uses the connected wallet directly via RainbowKit/wagmi's connector provider —
 * `connector.getProvider()` → `personal_sign` (never window.ethereum, never wagmi signMessage).
 * EOAs are verified offline by the backend; smart-contract wallets (e.g. Coinbase
 * Smart Wallet) fall back to on-chain EIP-1271 / ERC-6492 on the signed chainId.
 */

import { createSiweMessage } from 'viem/siwe';
import { getAddress } from 'viem';
import { API_URL, ApiError, apiFetch, clearTokens, getRefreshToken, getToken, setTokens } from './api';

/** SIWE message lifetime — matches the backend's 5-minute nonce TTL. */
const SIWE_TTL_MS = 5 * 60_000;

interface UserPayload { id: string; walletAddress: string; accountType: string | null; isAdmin: boolean }

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { message?: string; error?: string };
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function signInAdmin(
  address: `0x${string}`,
  chainId: number,
  provider: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> },
): Promise<{ accessToken: string; user: UserPayload }> {
  const checksummed = getAddress(address);

  // 1. Get nonce
  const nonceRes = await fetch(`${API_URL}/auth/nonce?address=${checksummed}`);
  if (!nonceRes.ok) throw new Error(await readError(nonceRes, 'Failed to fetch nonce'));
  const { nonce } = await nonceRes.json() as { nonce?: string };
  if (!nonce) throw new Error('Invalid nonce response from server');

  // 2. Build SIWE message — domain/uri are this page's host/origin; the backend
  //    checks domain ∈ SIWE_ALLOWED_DOMAINS and uri host === domain.
  const issuedAt = new Date();
  const message = createSiweMessage({
    domain: window.location.host,
    address: checksummed,
    statement: 'Sign in to Convexo Admin',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
    issuedAt,
    expirationTime: new Date(issuedAt.getTime() + SIWE_TTL_MS),
  });

  // 3. Sign (personal_sign — never use wagmi signMessage)
  const signature = (await provider.request({
    method: 'personal_sign',
    params: [message, checksummed],
  })) as string;

  // 4. Verify with backend
  const verifyRes = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, address: checksummed, chainId, authMethod: 'METAMASK' }),
  });
  if (!verifyRes.ok) throw new Error(await readError(verifyRes, 'Sign-in failed'));

  const { accessToken, refreshToken, user } = await verifyRes.json() as {
    accessToken?: string; refreshToken?: string; user: UserPayload;
  };
  if (!accessToken) throw new Error('No access token in verify response');

  setTokens(accessToken, refreshToken);

  // 5. Any wallet can obtain a JWT; only admins may enter. Don't leave a
  //    non-admin inside the shell with every call 403'ing.
  if (!user?.isAdmin) {
    await signOutAdmin();
    throw new ApiError('This wallet is not an admin. Ask a SUPER_ADMIN to grant a role.', 403);
  }

  return { accessToken, user };
}

/** Revokes the access + refresh token server-side, then clears local storage. */
export async function signOutAdmin(): Promise<void> {
  if (getToken()) {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: getRefreshToken() ?? undefined }),
      });
    } catch {}
  }
  clearTokens();
}
