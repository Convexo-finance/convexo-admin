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
│       └── page.tsx            — Main panel: sidebar nav + 9 tab views
├── components/admin/
│   ├── AdminDashboard.tsx      — 6 KPI cards: total users, pending KYC/KYB/credit score, pending OTC, active rates
│   ├── UserManagement.tsx      — User list (with admin role badge) + detail + AdminRolesPanel (grant/revoke)
│   ├── KYCReviewSystem.tsx     — KYC individual submission review + LP_Individuals NFT mint (3-arg safeMint)
│   ├── KYBReviewSystem.tsx     — KYB business submission review + LP_Business NFT mint (7-arg safeMint)
│   ├── CreditScoreManagement.tsx — Credit score override + ECREDITSCORING NFT mint (5-arg safeMint)
│   ├── OTCOrdersManagement.tsx — OTC order list + status progression (PENDING→CONFIRMED→IN_PROGRESS→COMPLETED)
│   ├── FundingManagement.tsx   — Business funding request review (approve/reject/notes)
│   ├── VaultsManagement.tsx    — Vault list (expand-in-place detail) + register form (POST /admin/vaults)
│   ├── ContractsView.tsx       — ContractSigner on-chain view + sign/cancel/execute write actions
│   └── index.tsx               — Barrel exports
├── lib/
│   ├── api.ts                  — apiFetch + apiDownload + apiUpload + silent 401 refresh (key: convexo_admin_jwt)
│   ├── auth.ts                 — signInAdmin() / signOutAdmin() via SIWE personal_sign
│   ├── wagmi.ts                — getDefaultConfig (RainbowKit v2 — Base, Mainnet, Sepolia)
│   ├── config/pinata.ts        — IPFS helpers + NFT metadata builders (synced from convexo_frontend)
│   ├── config/network.ts       — PRIMARY_CHAIN_ID / PRIMARY_CHAIN_NAME from NEXT_PUBLIC_NETWORK_MODE
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

## Admin capabilities (9 tabs)

| Tab | API | Notes |
|-----|-----|-------|
| Dashboard | `GET /admin/users`, `/admin/kyc/submissions?status=PENDING`, `/admin/kyb/submissions?status=PENDING`, `/admin/credit-score-requests?status=PENDING`, `/admin/otc/orders?status=PENDING`, `/rates` | 6 KPI cards + refresh button |
| Users | `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/roles`, `DELETE /admin/roles/:userId` | User list with admin role badge + AdminRolesPanel (grant/revoke VIEWER/VERIFIER/SUPER_ADMIN) |
| KYC Review | `GET /admin/kyc/submissions`, `PATCH /admin/kyc/submissions/:id/status`, `GET /admin/submissions/documents/:docId` | Document viewer, approve/reject, LP_Individuals NFT mint + auto-record |
| KYB Review | `GET /admin/kyb/submissions`, `PATCH /admin/kyb/submissions/:id/status`, `GET /admin/submissions/documents/:docId` | Same as KYC but for businesses — LP_Business NFT mint (7-arg safeMint) |
| Credit Score | `GET /admin/credit-score-requests`, `PUT /admin/credit-score-requests/:id/result`, `PUT /admin/credit-score-requests/:id/nft` | Score override, ECREDITSCORING NFT mint, auto-record direct to credit score request |
| OTC Orders | `GET /admin/otc/orders`, `PUT /admin/otc/orders/:id/status` | Status progression buttons, notes field |
| Funding | `GET /admin/funding/requests`, `PUT /admin/funding/requests/:id/review` | Approve/reject funding requests |
| Vaults | `GET /vaults`, `POST /admin/vaults` | Vault list + register form for on-chain deployed vaults |
| Contracts | On-chain reads + `signContract` / `cancelContract` / `executeContract` | ContractSigner lookup + write actions |

---

## Backend API (admin routes)

All require JWT + `AdminRole`. Role levels: VIEWER (read-only) < VERIFIER (approve/reject) < SUPER_ADMIN (full access).

```
GET    /admin/users                                — list users (includes adminRole badge data)
GET    /admin/users/:id                            — user detail + verifications
POST   /admin/roles                                — grant admin role {userId, role} (SUPER_ADMIN)
DELETE /admin/roles/:userId                        — revoke admin role (SUPER_ADMIN)

GET    /admin/kyc/submissions                      — list KYC individual submissions (VIEWER+)
GET    /admin/kyc/submissions/:id                  — single KYC submission
PATCH  /admin/kyc/submissions/:id/status           — approve/reject {status, reviewNote} (VERIFIER+)
GET    /admin/kyb/submissions                      — list KYB business submissions (VIEWER+)
PATCH  /admin/kyb/submissions/:id/status           — approve/reject (VERIFIER+)
GET    /admin/submissions/documents/:docId         — stream document file (VIEWER+)

GET    /admin/credit-score-requests                — list credit score requests (VIEWER+)
PUT    /admin/credit-score-requests/:id/result     — override score {approved, score, rating, ...} (VERIFIER+)
PUT    /admin/credit-score-requests/:id/nft        — record NFT token ID {nftTokenId} (VERIFIER+)

GET    /admin/otc/orders                           — list OTC orders (VIEWER+)
PUT    /admin/otc/orders/:id/status                — update status {status, notes} (VERIFIER+)

GET    /admin/funding/requests                     — list funding requests (VIEWER+)
PUT    /admin/funding/requests/:id/review          — approve/reject (VERIFIER+)

GET    /vaults                                     — list registered vaults (any auth)
POST   /admin/vaults                               — register on-chain vault in DB (VERIFIER+)

GET    /admin/verifications                        — legacy verification list (VIEWER+)
PUT    /admin/verifications/:id/status             — legacy update status (VERIFIER+)
PUT    /admin/verifications/:id/nft                — record NFT tokenId on verification (VERIFIER+)
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

## Phase status (v1.6 — 2026-04-27)

| Feature | Status | Notes |
|---------|--------|-------|
| Login (SIWE — RainbowKit multi-wallet) | ✅ Complete | |
| Dashboard — 6 KPI cards | ✅ Complete | Pending KYC/KYB/Credit Score/OTC + total users + active rates |
| Users — list + detail + AdminRoles | ✅ Complete | Role badge on list; grant/revoke VIEWER/VERIFIER/SUPER_ADMIN |
| KYC Review — document viewer + NFT mint | ✅ Complete | LP_Individuals 3-arg safeMint, auto-tokenId record |
| KYB Review — document viewer + NFT mint | ✅ Complete | LP_Business 7-arg safeMint, BusinessType uint8 mapping |
| Credit Score — override + NFT mint | ✅ Complete | ECREDITSCORING 5-arg safeMint, CreditTier from score |
| OTC Orders — status management | ✅ Complete | Status progression with valid-next-state buttons |
| Funding request review | ✅ Complete | |
| Vaults — list + register | ✅ Complete | Expand-in-place detail, register form for on-chain vaults |
| Contracts — view + sign/cancel/execute | ✅ Complete | Write actions via useConvexoWrite |
