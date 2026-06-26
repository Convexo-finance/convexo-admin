# Changelog — Convexo Admin

All notable changes to the admin panel are documented here.

---

## v1.9 — 2026-06-19
- `KYBReviewSystem.tsx` — added "Controller of Account" panel + "Claude Extraction" read-only diff (per-document extracted fields, amber = low confidence) for AI-assisted (custom doc-upload) submissions. Backend now returns `documents[].extractions` on `GET /admin/kyb/submissions/:id`
- `CreditScoreManagement.tsx` — added "Preliminary Score (Claude extraction)" panel: computed 0–100 score + tier + 7 indicators + extracted-statements list. Admin still sets the official 0–1000 score/tier via the existing override form. Backend now returns `computedScore`/`computedTier`/`extractedIndicators` + `documents[].extractions` on the credit-score list
- Extended `ScoreStatus` + `STATUS_STYLE` with the custom-flow draft statuses (DRAFT/EXTRACTING/READY_FOR_REVIEW/SCORE_COMPUTED/MINTED) so the "All" filter renders them
- Supports KYB-CREDIT-SCORE-PLAN.md P6. No NFT mint logic changed.

---

## v1.7 — 2026-05-14
- Synced `lib/contracts/addresses.ts` and `lib/contracts/abis.ts` from frontend (adds `MANUAL_PRICE_AGGREGATOR` field + ABI)
- Copied `abis/ManualPriceAggregator.json` from frontend
- Fixed CLAUDE.md doc typo: "5-arg safeMint" → "6-arg safeMint" for ECREDITSCORING (correct args: to, score, tier, maxLoanAmount, referenceId, uri)

---

## v1.8 — 2026-04-27

### ContractsView — required signers panel + gated Sign button

- Added `SignerRow` component: reads `hasSigned(hash, signerAddress)` on-chain per signer, shows signed/pending badge; highlights connected wallet with "(you)" label
- Added `getRequiredSigners` + `hasSigned` reads to `ContractsView`; Sign button now only renders when the connected wallet is a required signer AND has not yet signed
- `cancelContract` and `executeContract` remain always visible (admin has `DEFAULT_ADMIN_ROLE` / `VERIFIER_ROLE`)
- `npx tsc --noEmit` passes with zero errors

---

## v1.7 — 2026-04-27

### Contract wiring fix — signContract signature

- `ContractsView`: fixed `handleSign` — `signContract(bytes32, bytes)` requires two args; now performs `personal_sign` via `connector.getProvider()` first, then passes `[docHashBytes, signature]` to the contract; previously only passed the hash (one arg), which would revert on-chain
- `npx tsc --noEmit` passes with zero errors

---

## v1.6 — 2026-04-27

### Phase 8 — Contracts write actions

- `ContractsView`: added sign/cancel/execute on-chain write actions to the contract lookup panel — `signContract(bytes32)`, `cancelContract(bytes32)`, `executeContract(bytes32, uint256 vaultId)` via `useConvexoWrite`; buttons shown only when contract is not executed/cancelled; Execute shows only after `isFullySigned=true` with vault ID input (defaults to 0 for non-vault contracts); tx hash explorer link + success message on confirmation
- `npx tsc --noEmit` passes with zero errors

---

## v1.5 — 2026-04-27

### Phases 6 + 7 — Users/Admin Roles + Dashboard upgrade

- `UserManagement`: added `adminRole` badge to user list rows (amber badge showing VIEWER/VERIFIER/SUPER_ADMIN); added `AdminRolesPanel` section below user list — grant role (`POST /admin/roles` with userId+role) + revoke role (`DELETE /admin/roles/:userId`), role hierarchy note shown
- `AdminDashboard`: upgraded from 4 to 6 KPI cards — replaces old `pendingVerifications` with three specific pending counts: Pending KYC (`/admin/kyc/submissions?status=PENDING`), Pending KYB (`/admin/kyb/submissions?status=PENDING`), Pending Credit Score (`/admin/credit-score-requests?status=PENDING`); added manual refresh button; 2-col mobile / 3-col desktop grid
- `npx tsc --noEmit` passes with zero errors

---

## v1.4 — 2026-04-27

### Phases 3, 4, 5 — Credit Score, Vaults, OTC Orders

- `CreditScoreManagement`: full implementation — status filter (PENDING/UNDER_REVIEW/APPROVED/REJECTED/NFT_REQUESTED/COMPLETE), financial metrics panel, admin override form (`PUT /admin/credit-score-requests/:id/result` with score/rating/approved/notes), ECREDITSCORING NFT mint (5-arg `safeMint`: to, score, CreditTier uint8 derived from score, maxLoanAmount parsed from string, referenceId=submissionId), auto-record via `PUT /admin/credit-score-requests/:id/nft` (direct, no verifId lookup needed)
- `OTCOrdersManagement`: full implementation — paginated order list with status filter, BUY/SELL type badge, trade detail panel, status progression buttons (only valid next states shown: PENDING→CONFIRMED/CANCELLED, CONFIRMED→IN_PROGRESS/CANCELLED, IN_PROGRESS→COMPLETED/CANCELLED), notes field, `PUT /admin/otc/orders/:id/status`
- `VaultsManagement`: full implementation — vault list with expand-in-place detail (principal, interest rate, fee, maturity, borrower, explorer link), collapsible register form (`POST /admin/vaults`) for recording on-chain deployed vaults, USDC 6-decimal formatting, basis-point rate display
- `npx tsc --noEmit` passes with zero errors

---

## v1.3 — 2026-04-27

### Phase 2 — KYC + KYB full review implementations

- `KYCReviewSystem`: full implementation — 3-column layout, status filter tabs, document viewer via `apiDownload`, approve/reject via `PATCH /admin/kyc/submissions/:id/status`, LP_Individuals NFT mint (`safeMint(to, submissionId, uri)` 3-arg), auto-tokenId extraction from Transfer event log (topic3), auto-record via `PUT /admin/verifications/:id/nft`
- `KYBReviewSystem`: full implementation — same pattern as KYC, but for business submissions: company metadata display (name, reg#, jurisdiction, type), LP_Business NFT mint (`safeMint` 7-arg with BusinessType uint8 mapping: Corporation=0, LLC=1, Partnership=2, SoleProprietor=3, Other=4), verification type `KYB_BUSINESS` + provider `INTERNAL` for post-approval verifId lookup
- `npx tsc --noEmit` passes with zero errors

---

## v1.2 — 2026-04-27

### Phase 1 — Sidebar 9-tab refactor + API helpers

- Restructured sidebar from 8 tabs to 9 clean tabs: Dashboard, Users, KYC Review, KYB Review, Credit Score, OTC Orders, Funding, Vaults, Contracts
- Removed NFT Management tab — minting will live inside each review tab (Phase 2/3)
- Removed deprecated Verifications tab (was calling VeriffVerifier/SumsubVerifier contracts directly)
- Removed Treasuries tab — will merge into Vaults (Phase 4)
- Added chain-mismatch banner in sidebar when connected wallet is on wrong chain vs `PRIMARY_CHAIN_ID`
- `UserManagement`: removed `OnChainMintSection` sub-tab (duplicate minting without backend connection)
- `lib/api.ts`: added `apiUpload` helper for multipart form uploads (mirrors `apiDownload` pattern)
- New placeholder components: `KYCReviewSystem`, `KYBReviewSystem`, `CreditScoreManagement`, `OTCOrdersManagement`
- Updated `components/admin/index.tsx` barrel exports
- `npx tsc --noEmit` passes with zero errors

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
