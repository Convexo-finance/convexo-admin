# Convexo Admin — AI Context (CLAUDE.md)

Single source of truth for AI agents working on `convexo-admin/`.
Read this before touching any file. Update it when you change architecture.

---

## What this project is

`convexo-admin/` is the **standalone admin panel** for the Convexo Protocol, deployed at `admin.convexo.xyz`. It is a Next.js 15 App Router application that gives authorized wallet holders (EOA addresses listed in the backend's `ADMIN_WALLET_ADDRESSES` env var) the ability to review verifications, mint LP NFTs, manage OTC orders, inspect users, oversee vaults, approve funding requests, and view on-chain contract state. It talks exclusively to the shared Fastify 5 backend at `NEXT_PUBLIC_API_URL`. Auth is SIWE (EIP-4361) via any connected EOA wallet — no Account Kit, no smart accounts. Wallet connection uses **RainbowKit v2** (supports MetaMask, WalletConnect, Coinbase Wallet, and all injected wallets).

---

## Folder structure

```
convexo-admin/
├── app/
│   ├── layout.tsx              — Root layout: Inter font + Providers
│   ├── page.tsx                — Login page (RainbowKit ConnectButton → SIWE → JWT)
│   ├── globals.css             — Tailwind base + .card / .btn-* utilities
│   ├── providers.tsx           — WagmiProvider + QueryClientProvider + RainbowKitProvider
│   ├── api/
│   │   └── upload-pinata/
│   │       └── metadata/route.ts — Proxy: uploads NFT metadata JSON to Pinata (server-side PINATA_JWT)
│   └── dashboard/
│       ├── layout.tsx          — Auth guard: redirects to / if no JWT in localStorage
│       └── page.tsx            — Main panel: sidebar nav + 8 tab views
├── components/admin/
│   ├── AdminDashboard.tsx      — Stats overview (users, verifications, OTC, rates)
│   ├── UserManagement.tsx      — User list + profile inspection
│   ├── VeriffVerificationSystem.tsx — KYC approval/rejection + LP_Individuals NFT mint
│   ├── SumsubVerificationSystem.tsx — KYB approval/rejection + LP_Business NFT mint
│   ├── NFTAdminPanel.tsx       — Direct LP NFT minting (bypass verification flow)
│   ├── VaultsManagement.tsx    — Vault state reads via useReadContract
│   ├── FundingManagement.tsx   — Business funding request review
│   ├── TreasuriesView.tsx      — Pool/treasury on-chain state
│   ├── ContractsView.tsx       — ContractSigner state view
│   └── index.tsx               — Barrel exports
├── lib/
│   ├── api.ts                  — apiFetch + JWT header + silent 401 refresh (key: convexo_admin_jwt)
│   ├── auth.ts                 — signInAdmin() / signOutAdmin() via SIWE personal_sign
│   ├── wagmi.ts                — getDefaultConfig (RainbowKit v2 — Base, Mainnet, Sepolia)
│   ├── config/pinata.ts        — IPFS helpers + NFT metadata builders (synced from convexo_frontend)
│   ├── contracts/
│   │   ├── addresses.ts        — Multi-chain contract addresses (synced from convexo_frontend)
│   │   ├── abis.ts             — Contract ABIs (synced from convexo_frontend)
│   │   └── ecopAbi.ts          — ECOP token ABI
│   └── hooks/
│       └── useConvexoWrite.ts  — Re-exports wagmi useWriteContract (EOA only, no MAv2)
├── abis/                       — JSON ABI files (synced from convexo_frontend/abis/)
├── public/                     — Static assets (logo_convexo.png)
├── .env.example                — All required env vars with descriptions
├── next.config.js              — webpack alias: thread-stream → false
├── tailwind.config.ts
└── package.json
```

---

## Tech stack

| Tool | Version | Why |
|------|---------|-----|
| Next.js | 15.x App Router | Same as frontend, SSR + streaming |
| TypeScript | 5.3 | Strict types throughout |
| wagmi | v2 | Hooks for chain ID, account, contract reads/writes |
| viem | v2 | Low-level ETH: SIWE message creation, signature verification |
| RainbowKit | v2 | Multi-wallet connection modal (MetaMask, WalletConnect, Coinbase, injected) |
| React Query | v5 | 5min stale / data caching |
| Tailwind CSS | v3 | Utility classes; `.card` and `.btn-*` in globals.css |
| @heroicons/react | v2 | Icons |

---

## What Claude is allowed and not allowed to do

### Allowed
- Read and edit any file in `app/`, `components/`, `lib/`, `abis/`
- Run `npm run type-check`, `npm run build`, `npm run dev`
- Run `npx tsc --noEmit` to check types
- Run `grep`, `find`, `git status`, `git diff`, `git log`
- Append to `CHANGELOG.md` after every meaningful change (required)

### Not allowed
- Import anything from `@account-kit/*` or `@alchemy/*` — not installed, not allowed
- Use `wagmi`'s `signMessage` for SIWE — use `provider.request({ method: 'personal_sign', ... })` directly
- Use `window.ethereum` directly after wallet connect — use `connector.getProvider()` instead (works for all wallet types including WalletConnect)
- Edit `lib/contracts/addresses.ts`, `lib/contracts/abis.ts`, or `abis/` directly — these are synced from `convexo_frontend/`; update the source there
- Edit `lib/config/pinata.ts` directly — synced from `convexo_frontend/lib/config/pinata.ts`
- Run `git push`, `git commit`, `git reset`, `git checkout --`, `rm -rf`
- Modify `.env.local` — never touch actual secrets

---

## Critical rules

### 1. No Account Kit — ever

Account Kit (Alchemy) is NOT installed or used in this app. All wallet interactions go through plain wagmi + RainbowKit.

```typescript
// ✅ Correct
import { useAccount, useChainId, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// ❌ Wrong — Account Kit not installed
import { useAuthModal } from '@account-kit/react'
```

### 2. Auth flow — SIWE via connector.getProvider()

Never use `window.ethereum` after wallet connect — it only works for injected wallets. With RainbowKit, the user may be connected via WalletConnect or Coinbase Wallet.

```typescript
// ✅ Correct — works for all wallet types
const { connector } = useAccount()
const provider = await connector.getProvider()
provider.request({ method: 'personal_sign', params: [message, address] })

// ❌ Wrong — breaks for WalletConnect / Coinbase
window.ethereum.request({ method: 'personal_sign', ... })
```

`lib/auth.ts` implements this. Do not change the signing method.

### 3. JWT storage — separate key

Admin JWT is stored as `convexo_admin_jwt` (NOT `convexo_jwt`). This ensures the two apps cannot interfere with each other even if served on the same origin.

### 4. Always use webpack, never Turbopack

```bash
npm run dev     # ✅ next dev --port 3002
npx next dev    # ❌ Turbopack — breaks thread-stream / pino dependencies
```

### 5. contracts/, abis/, and lib/config/ are copies from convexo_frontend

These files are synced manually. Never edit them directly here.
- Source of truth: `convexo_frontend/lib/contracts/addresses.ts`
- When contracts change: copy updated file to `convexo-admin/lib/contracts/addresses.ts`
- Same for `abis.ts`, `abis/` directory, and `lib/config/pinata.ts`

### 6. useConvexoWrite is a direct re-export of wagmi useWriteContract

The main frontend routes writes through Account Kit. The admin app only needs EOA, so `lib/hooks/useConvexoWrite.ts` simply re-exports `useWriteContract`. Do not add Account Kit routing here.

---

## Auth architecture

```
Connect wallet (RainbowKit modal — MetaMask / WalletConnect / Coinbase / injected)
→ GET /auth/nonce?address=<wallet>
→ build EIP-4361 SIWE message (viem createSiweMessage)
→ connector.getProvider() → personal_sign
→ POST /auth/verify { message, signature, address, chainId, authMethod: 'METAMASK' }
→ store accessToken in localStorage('convexo_admin_jwt')
→ store refreshToken in localStorage('convexo_admin_refresh')
→ auto-refresh via 401 interceptor in lib/api.ts
→ redirect to /dashboard
```

Backend `requireAdmin` middleware checks `AdminRole` table (seeded from `ADMIN_WALLET_ADDRESSES` env var on first login). Only addresses in that env var can sign in — all others get 403.

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
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PINATA_GATEWAY=lime-famous-condor-7.mypinata.cloud
NEXT_PUBLIC_NETWORK_MODE=testnet                   # mainnet | testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=              # from cloud.walletconnect.com

# Server-side only — for /api/upload-pinata/metadata route
PINATA_JWT=
PINATA_API_KEY=
PINATA_SECRET_KEY=
```

---

## Running locally

```bash
cd convexo-admin
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev                  # → http://localhost:3002
```

Backend must be running at `NEXT_PUBLIC_API_URL`. Your wallet address must be in `ADMIN_WALLET_ADDRESSES` env var on the backend.

---

## Deployment

- Deploy to Vercel (separate project from convexo_frontend)
- Custom domain: `admin.convexo.xyz`
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect support
- No CORS changes needed — access controlled by JWT + AdminRole

---

## Skill trigger table

| Condition | Skill to activate |
|-----------|------------------|
| TypeScript error or type mismatch | `.claude/skills/fix-error.md` |
| Adding a new admin tab or section | `.claude/skills/add-admin-tab.md` |
| Contract addresses or ABIs changed | `.claude/skills/sync-contracts.md` |
| Deployment fails or env var missing | `.claude/skills/deploy-check.md` |
| Any meaningful code change | Append to `CHANGELOG.md` (required, always) |

---

## CHANGELOG rule

After every meaningful change (new feature, bug fix, refactor, dependency update), Claude must append an entry to `CHANGELOG.md` using this format:

```markdown
## v<next> — <YYYY-MM-DD>
- <what changed and why, one line per item>
```

Do not skip this. Do not batch multiple sessions into one entry. Each session gets its own entry.

---

## Phase status

| Feature | Status |
|---------|--------|
| Login (SIWE — RainbowKit multi-wallet) | ✅ Complete |
| Dashboard stats | ✅ Complete |
| User management | ✅ Complete |
| Veriff KYC approval + NFT mint | ✅ Complete |
| Sumsub KYB approval + NFT mint | ✅ Complete |
| NFT admin panel (LP minting) | ✅ Complete |
| Vaults overview | ✅ Complete |
| Funding request review | ✅ Complete |
| Treasuries view | ✅ Complete |
| Contracts view | ✅ Complete |
