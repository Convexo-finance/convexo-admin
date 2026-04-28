# sync-contracts — Sync contract addresses and ABIs from frontend

trigger: Contract addresses change after redeployment, new chain added, or ABI updated

---

## Steps

1. **Confirm the source has changed:**
   ```bash
   diff lib/contracts/addresses.ts ../convexo_frontend/lib/contracts/addresses.ts
   diff lib/contracts/abis.ts ../convexo_frontend/lib/contracts/abis.ts
   ```

2. **Copy the updated files:**
   ```bash
   cp ../convexo_frontend/lib/contracts/addresses.ts lib/contracts/addresses.ts
   cp ../convexo_frontend/lib/contracts/abis.ts lib/contracts/abis.ts
   cp -r ../convexo_frontend/abis/ abis/
   ```

3. **Sync IPFS/pinata config if NFT metadata changed:**
   ```bash
   cp ../convexo_frontend/lib/config/pinata.ts lib/config/pinata.ts
   ```

4. **Run type-check to confirm no breakage:**
   ```bash
   npm run type-check
   ```

5. **Verify key addresses are present** for both mainnet and testnet chains — look for zero addresses `0x0000...` on chains that should be fully deployed.

6. **Update CHANGELOG.md** with what changed (which chain, which contracts, why).

## What NOT to do

- Do not edit `addresses.ts`, `abis.ts`, or `abis/` directly in convexo-admin
- Do not add new contracts to `addresses.ts` here — add them in `convexo_frontend` first
- Do not change the `DETERMINISTIC` constants without deploying new contracts first

## MCP to activate

- None required — this is a file copy operation
