# Convexo Admin — AI Context (CLAUDE.md)

Single source of truth for AI agents working on `convexo-admin/`.
Read this before touching any file. Update it when you change architecture.

---

## What this app is

`convexo-admin/` is the **standalone admin panel** for the Convexo Protocol, deployed at `admin.convexo.xyz`.

It is a **separate Next.js app** from `convexo_frontend/` by design:
- Different JWT origin → XSS blast-radius isolation (admin JWT never shared with user app)
- No Account Kit, no smart account paths — admins always use EOA wallets (MetaMask)
- Smaller bundle (no viem/Uniswap/ZKPassport deps at import time)
- Independent deployment cadence

Same backend API as the main app (`NEXT_PUBLIC_API_URL`).

---

## Repository layout

```
convexo-admin/
├── app/
│   ├── layout.tsx          — Root layout (Providers)
│   ├── page.tsx            — Login page (MetaMask → SIWE → JWT)
│   ├── globals.css         — Tailwind base + .card / .btn-* utilities
│   ├── providers.tsx       — WagmiProvider + QueryClientProvider
│   └── dashboard/
│       ├── layout.tsx      — Auth guard (redirect → / if no JWT)
│       └── page.tsx        — Main admin panel (sidebar + 8 tabs)
├── components/
│   └── admin/
│       ├── AdminDashboard.tsx           — Stats overview
│       ├── UserManagement.tsx           — User list + KYC actions
│       ├── VeriffVerificationSystem.tsx — Veriff KYC approval
│       ├── SumsubVerificationSystem.tsx — Sumsub KYB approval
│       ├── NFTAdminPanel.tsx            — LP NFT minting
│       ├── VaultsManagement.tsx         — Vault oversight
│       ├── FundingManagement.tsx        — Funding request review
│       ├── TreasuriesView.tsx           — Treasury view
│       ├── ContractsView.tsx            — On-chain contract view
│       └── index.tsx                   — Barrel exports
├── lib/
│   ├── api.ts              — apiFetch + JWT + silent refresh (key: convexo_admin_jwt)
│   ├── auth.ts             — signInAdmin() + signOutAdmin() via SIWE
│   ├── wagmi.ts            — createConfig (Base, Mainnet, Sepolia — injected + MetaMask)
│   ├── contracts/
│   │   ├── addresses.ts    — Copied from convexo_frontend (same contract addresses)
│   │   ├── abis.ts         — Copied from convexo_frontend
│   │   └── ecopAbi.ts      — ECOP token ABI
│   └── hooks/
│       └── useConvexoWrite.ts — Re-exports wagmi useWriteContract (EOA only, no MAv2)
├── abis/                   — JSON ABIs (synced from convexo_frontend/abis/)
├── .env.example
├── next.config.js          — webpack (thread-stream alias)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Critical rules

### 1. No Account Kit — ever

Account Kit (Alchemy) is NOT installed or used in this app. All wallet interactions go through plain wagmi.

```typescript
// ✅ Correct
import { useAccount, useChainId, useWriteContract } from 'wagmi'

// ❌ Wrong — Account Kit not installed
import { useAuthModal } from '@account-kit/react'
```

### 2. Auth flow — SIWE via EOA

Same SIWE pattern as `convexo_frontend/useAuth.ts` EOA path. **Never use wagmi `signMessage`** (calls `getChainId` on connector internally which may not work).

```typescript
// Always use EIP-1193 personal_sign directly:
provider.request({ method: 'personal_sign', params: [message, address] })
```

`lib/auth.ts` implements this. Do not change the signing method.

### 3. JWT storage — separate key

Admin JWT is stored as `convexo_admin_jwt` (NOT `convexo_jwt`). This ensures the two apps cannot interfere with each other's auth state even if temporarily served on the same origin.

### 4. Always use webpack

```bash
npm run dev     # ✅ next dev --webpack --port 3002
npx next dev    # ❌ Turbopack — breaks thread-stream
```

### 5. contracts/ and abis/ are copies from convexo_frontend

When contracts are redeployed and addresses change:
1. Update `convexo_frontend/lib/contracts/addresses.ts`
2. Copy the updated file to `convexo-admin/lib/contracts/addresses.ts`
3. Same for `abis.ts` and the `abis/` directory

Do NOT diverge these files — they must stay in sync.

### 6. useConvexoWrite is a direct re-export of wagmi useWriteContract

The main frontend has a smart `useConvexoWrite` that routes to either MAv2 (Account Kit) or EOA. The admin app only needs EOA, so `lib/hooks/useConvexoWrite.ts` simply re-exports wagmi's `useWriteContract`.

If admin components need on-chain writes, they use `useConvexoWrite` which resolves to `useWriteContract`.

---

## Auth architecture

```
Connect MetaMask
→ GET /auth/nonce?address=<wallet>
→ build EIP-4361 SIWE message
→ personal_sign via window.ethereum
→ POST /auth/verify { message, signature, address, chainId, authMethod: 'METAMASK' }
→ store accessToken in localStorage('convexo_admin_jwt')
→ store refreshToken in localStorage('convexo_admin_refresh')
→ auto-refresh via 401 interceptor in lib/api.ts
→ redirect to /dashboard
```

Backend `requireAdmin` middleware checks `AdminRole` table (seeded from `ADMIN_WALLET_ADDRESSES` env var on first login).

---

## Admin capabilities

| Tab | API | Notes |
|-----|-----|-------|
| Dashboard | `GET /admin/users`, `GET /admin/verifications`, `GET /admin/otc/orders`, `GET /rates` | Stats overview |
| Users | `GET /admin/users`, `GET /admin/users/:id` | View + manage users |
| Verifications | `GET /admin/verifications`, `PUT /admin/verifications/:id/status`, `PUT /admin/verifications/:id/nft` | Approve/reject KYC/KYB + mint LP NFT |
| NFT Management | On-chain reads + `useConvexoWrite` → `mintTo` | Mint LP_Individuals / LP_Business NFTs |
| Vaults | On-chain reads via `useReadContract` | View vault states |
| Funding | `GET /admin/funding/requests`, `PUT /admin/funding/requests/:id/review` | Approve/reject funding requests |
| Treasuries | On-chain reads | View pool state |
| Contracts | On-chain reads | View ContractSigner state |

---

## Backend API (admin routes)

All require JWT + `AdminRole` (VIEWER or VERIFIER level):

```
GET  /admin/users                          — list all users
GET  /admin/users/:id                      — user detail
GET  /admin/verifications                  — list verifications (filterable by status)
PUT  /admin/verifications/:id/status       — update verification status
PUT  /admin/verifications/:id/nft          — mint LP NFT post-approval
GET  /admin/otc/orders                     — list OTC orders
GET  /admin/funding/requests               — list all funding requests
PUT  /admin/funding/requests/:id/review    — approve/reject funding request
```

---

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001           # backend URL
NEXT_PUBLIC_PINATA_GATEWAY=lime-famous-condor-7.mypinata.cloud
NEXT_PUBLIC_NETWORK_MODE=testnet                   # mainnet | testnet
```

---

## Running locally

```bash
cd convexo-admin
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev                  # → http://localhost:3002
```

Backend must be running at `NEXT_PUBLIC_API_URL`. Your wallet address must be in `ADMIN_WALLET_ADDRESSES` env var on the backend (auto-seeds AdminRole on first login).

---

## Deployment

Deploy to Vercel (separate project from convexo_frontend):
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Custom domain: `admin.convexo.xyz`
- No CORS changes needed — backend has permissive CORS, access controlled by JWT + AdminRole

---

## Phase status

| Feature | Status |
|---------|--------|
| Login (SIWE MetaMask) | ✅ Complete |
| Dashboard stats | ✅ Complete |
| User management | ✅ Complete |
| Veriff KYC approval + NFT mint | ✅ Complete |
| Sumsub KYB approval + NFT mint | ✅ Complete |
| NFT admin panel (LP minting) | ✅ Complete |
| Vaults overview | ✅ Complete |
| Funding request review | ✅ Complete |
| Treasuries view | ✅ Complete |
| Contracts view | ✅ Complete |
