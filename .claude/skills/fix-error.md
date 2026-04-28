# fix-error — Fix TypeScript errors and runtime failures

trigger: Any TypeScript compilation error, type mismatch, or runtime error in the admin panel

---

## Steps

1. **Read the error in full** — copy the exact error message and file:line before touching anything.

2. **Identify error category:**
   - TypeScript type error → check interface definitions in `lib/api.ts`, component props
   - `connector` is possibly undefined → add `if (!connector) return` guard before `connector.getProvider()`
   - `Cannot find module '@rainbow-me/rainbowkit'` → run `npm install @rainbow-me/rainbowkit`
   - `window is not defined` → component needs `'use client'` or `typeof window !== 'undefined'` guard
   - `ApiError` with 401 → JWT expired; the silent refresh in `lib/api.ts` should handle it — if not, check `convexo_admin_refresh` in localStorage
   - `ApiError` with 403 → wallet not in `ADMIN_WALLET_ADDRESSES` on backend

3. **For TypeScript errors:**
   ```bash
   npx tsc --noEmit 2>&1 | head -50
   ```
   Fix the specific error. Do not add `// @ts-ignore` — fix the root cause.

4. **For API shape errors** (runtime, e.g. `undefined is not iterable`):
   - Check what the API actually returns: look at the backend route in `convexo-backend/src/modules/admin/`
   - Update the TypeScript interface to match reality — not the other way around
   - Common admin API response shape: `{ data: T, total?: number }`

5. **For wagmi/viem errors:**
   - Use context7 MCP to fetch current wagmi v2 docs: `resolve-library-id wagmi` then `query-docs`
   - `useReadContract` with wrong ABI → check `lib/contracts/abis.ts`
   - Chain ID mismatch → use `useChainId()` hook, not hardcoded values

6. **After fixing:** run `npm run type-check` to confirm clean. Append to CHANGELOG.md.

## MCP to activate

- `context7`: for wagmi v2 / viem / RainbowKit API questions
- `playwright`: for verifying the fix works in the browser
