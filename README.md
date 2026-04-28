# Convexo Admin Panel

Standalone admin panel for the Convexo Protocol, deployed at `admin.convexo.xyz`.

Separate from `convexo_frontend/` by design — different JWT origin, no Account Kit, EOA-only auth, independent deployment cadence.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev                  # → http://localhost:3002
```

Connect any wallet (MetaMask, WalletConnect, Coinbase Wallet) → Sign SIWE message → Access granted if wallet is in `ADMIN_WALLET_ADDRESSES`.

---

## Features (9 tabs)

| Tab | What it does |
|-----|-------------|
| Dashboard | 6 KPIs: total users, pending KYC/KYB/credit score, pending OTC, active rates |
| Users | View all users with admin role badge; grant/revoke VIEWER/VERIFIER/SUPER_ADMIN roles |
| KYC Review | Review individual identity submissions, view documents, approve/reject, mint LP_Individuals NFT |
| KYB Review | Review business submissions, view documents, approve/reject, mint LP_Business NFT |
| Credit Score | Override n8n AI scores, mint ECREDITSCORING NFT (Tier 3) |
| OTC Orders | Manage cash-in/cash-out orders — status progression with notes |
| Funding | Review business funding requests (approve/reject) |
| Vaults | List registered TokenizedBondVaults; register new on-chain vaults |
| Contracts | ContractSigner on-chain view + sign/cancel/execute write actions |

---

## Tech stack

- Next.js 15 (App Router, webpack — no Turbopack)
- RainbowKit v2 + wagmi v2 + viem (EOA wallet — no Account Kit)
- TanStack Query v5
- Tailwind CSS v3

---

## Environment variables

```env
NEXT_PUBLIC_API_URL=https://api.convexo.xyz
NEXT_PUBLIC_NETWORK_MODE=mainnet                  # mainnet | testnet
NEXT_PUBLIC_PINATA_GATEWAY=lime-famous-condor-7.mypinata.cloud
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=             # from cloud.walletconnect.com
PINATA_JWT=                                       # server-side only
```

---

## Auth

SIWE (Sign-In with Ethereum) via RainbowKit — same backend as `convexo_frontend` but stored as `convexo_admin_jwt` (separate localStorage key for XSS isolation).

Backend bootstrap: add admin wallet to `ADMIN_WALLET_ADDRESSES` in backend `.env`. The `AdminRole` record is seeded automatically on first login.

---

## Contract sync

`lib/contracts/addresses.ts`, `lib/contracts/abis.ts`, and `abis/` are synced from `convexo_frontend/`. Run `/sync-from-frontend` or copy manually when contracts change.

---

For full AI context see [CLAUDE.md](./CLAUDE.md).
