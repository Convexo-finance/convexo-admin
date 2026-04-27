# Testing Practices — Convexo Admin

No test framework is currently installed. This document establishes the recommended approach.

---

## Current state

No unit tests exist. TypeScript is the primary correctness tool: `npm run type-check` catches interface mismatches, missing props, and bad API response shapes.

Run before every commit:
```bash
npm run type-check
```

## Recommended test approach (when tests are added)

### Unit tests — Vitest

Best fit for this stack (works with Next.js App Router, fast HMR).

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

Test files: `*.test.ts` or `*.test.tsx` alongside the file being tested.

Test these specifically:
- `lib/api.ts` — apiFetch JWT injection, 401 refresh logic, ApiError shape
- `lib/auth.ts` — signInAdmin message building, token storage
- `lib/contracts/addresses.ts` — getContractsForChain, hasFullProtocol, getBlockExplorerUrl

Do NOT test:
- React components (integration tests via Playwright are more valuable for this admin app)
- External API responses (mock at the boundary only)

### Integration / E2E — Playwright (MCP available)

The Playwright MCP is configured in `mcp.json`. Use it to:
1. Test the login flow: connect wallet → SIWE sign → redirect to /dashboard
2. Test tab navigation: dashboard → users → verifications → NFT
3. Verify table rendering after API calls

```typescript
// Example Playwright test for login flow
test('admin login', async ({ page }) => {
  await page.goto('http://localhost:3002');
  // Use Playwright MCP via Claude to drive the browser
});
```

## What counts as a passing PR

- `npm run type-check` exits 0
- No console.error in browser during manual smoke test of login + dashboard load
- All 8 tabs render without crashing
