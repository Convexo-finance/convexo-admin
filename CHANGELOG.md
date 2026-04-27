# Changelog — Convexo Admin

All notable changes to the admin panel are documented here.

---

## v1.1 — 2026-04-27

- Replaced hardcoded MetaMask connector with **RainbowKit v2** — supports MetaMask, WalletConnect, Coinbase Wallet, and all injected wallets
- Updated `lib/wagmi.ts` to use `getDefaultConfig` from RainbowKit instead of manual `createConfig`
- Updated `app/providers.tsx` to wrap with `RainbowKitProvider` (dark theme, purple accent `#7c3aed`)
- Updated `app/page.tsx` — `<ConnectButton label="Connect Wallet" />` replaces manual connect button
- Auth signing now uses `connector.getProvider()` instead of `window.ethereum` — works for all wallet types including WalletConnect
- Added `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to `.env.example`
- Set up full Claude Code workspace: `CLAUDE.md`, `CHANGELOG.md`, `CLAUDE.local.md`, `mcp.json`, `.claude/` rules, skills, commands, hooks

---

## v1.0 — 2026-04-01

- Initial admin panel release
- Login page: MetaMask connect → SIWE signature → JWT stored in `localStorage('convexo_admin_jwt')`
- 8-tab dashboard: Overview, Users, Verifications (Veriff + Sumsub), NFT Management, Vaults, Funding, Treasuries, Contracts
- Backend API integration: all admin routes wired via `apiFetch` with JWT + silent 401 refresh
- On-chain reads via `useReadContract` (wagmi v2)
- On-chain writes via `useConvexoWrite` (re-exports `useWriteContract`)
- LP NFT minting: `mintTo` on LP_Individuals and LP_Business contracts
- Veriff KYC and Sumsub KYB approval flows with NFT mint on approval
- Funding request review (approve/reject/notes)
- Multi-chain contract address support (6 chains via CREATE2 deterministic addresses)
