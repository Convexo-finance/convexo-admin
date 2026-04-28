# sync-from-frontend — Sync shared files from convexo_frontend

Run this after contract redeployment or NFT metadata changes.

---

## Command

```
Sync the following files from convexo_frontend into convexo-admin.
Only copy — do not modify content. After copying, run npm run type-check to confirm no breakage.

Files to sync:
1. ../convexo_frontend/lib/contracts/addresses.ts  →  lib/contracts/addresses.ts
2. ../convexo_frontend/lib/contracts/abis.ts        →  lib/contracts/abis.ts
3. ../convexo_frontend/abis/ (entire directory)     →  abis/
4. ../convexo_frontend/lib/config/pinata.ts         →  lib/config/pinata.ts

After syncing:
- Run npm run type-check
- If any errors, report them — do not auto-fix without reviewing the cause
- Append a CHANGELOG entry describing what was synced and why
```
