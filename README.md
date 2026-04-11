# Convexo Admin Panel

Standalone admin panel for the Convexo Protocol, deployed at `admin.convexo.xyz`.

Separate from `convexo_frontend/` by design — different JWT origin, no Account Kit, EOA-only auth, independent deployment cadence.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                  # → http://localhost:3002
```

Connect MetaMask → Sign SIWE message → Access granted if wallet is in `ADMIN_WALLET_ADDRESSES`.

---

## Features

| Tab | What it does |
|-----|-------------|
| Dashboard | User count, pending verifications, OTC orders, exchange rates |
| Users | View all users, inspect profile + onboarding state |
| Verifications | Approve/reject Veriff KYC + Sumsub KYB, mint LP NFTs |
| NFT Management | Direct LP_Individuals / LP_Business NFT minting |
| Vaults | On-chain vault state overview |
| Funding | Review business funding requests (approve/reject/notes) |
| Treasuries | Pool and treasury state |
| Contracts | ContractSigner on-chain view |

---

## Tech stack

- Next.js 14 (App Router, webpack)
- wagmi 2 + viem (EOA wallet — no Account Kit)
- TanStack Query
- Tailwind CSS

---

## Environment variables

```env
NEXT_PUBLIC_API_URL=https://api.convexo.xyz      # backend
NEXT_PUBLIC_NETWORK_MODE=mainnet                  # mainnet | testnet
NEXT_PUBLIC_PINATA_GATEWAY=lime-famous-condor-7.mypinata.cloud
```

---

## Auth

SIWE (Sign-In with Ethereum) — same backend as `convexo_frontend` but stored in `convexo_admin_jwt` (separate localStorage key for XSS isolation).

Backend bootstrap: add admin wallet to `ADMIN_WALLET_ADDRESSES` in backend `.env`. The `AdminRole` record is seeded automatically on first login.

---

For full AI context see [CLAUDE.md](./CLAUDE.md).
