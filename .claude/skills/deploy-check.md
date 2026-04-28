# deploy-check — Verify deployment readiness

trigger: Deployment fails on Vercel, env var errors appear, or user asks "why isn't this working in production?"

---

## Steps

1. **Check required env vars are set in Vercel:**
   ```
   NEXT_PUBLIC_API_URL           — must be production backend URL (not localhost)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — required for WalletConnect
   NEXT_PUBLIC_NETWORK_MODE      — mainnet or testnet
   NEXT_PUBLIC_PINATA_GATEWAY    — Pinata gateway hostname
   PINATA_JWT                    — server-side, for metadata upload route
   ```

2. **Check for inline comments in Vercel env vars** — Vercel treats `value # comment` as the literal value including the `#`. Values must be clean strings, no comments.

3. **Check the build log** for TypeScript errors:
   ```bash
   npm run build 2>&1 | tail -30
   ```

4. **Common production-only failures:**
   - `window is not defined` — component uses `localStorage` or `window` without `typeof window !== 'undefined'` guard or `'use client'`
   - CORS error → backend env `FRONTEND_URL` may need `admin.convexo.xyz` added
   - 403 on all admin API calls → wallet address not in `ADMIN_WALLET_ADDRESSES` on production backend
   - RainbowKit WalletConnect fails → `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` not set or wrong

5. **Check `app/dashboard/layout.tsx`** — auth guard uses `localStorage.getItem('convexo_admin_jwt')`. If this returns null on load (e.g. SSR hydration), the redirect fires before the client reads the token. The `typeof window !== 'undefined'` check should prevent this.

6. **After fixing:** trigger a new Vercel deployment and watch build logs.

## MCP to activate

- Vercel MCP (if configured): check deployment logs
- `playwright`: verify login flow works on the deployed URL
