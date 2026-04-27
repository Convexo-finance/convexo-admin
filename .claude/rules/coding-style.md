# Coding Style — Convexo Admin

Rules derived from patterns observed in the existing codebase.

---

## TypeScript

- Strict mode is on (`tsconfig.json`). No `any` without a cast comment.
- Use `unknown` for caught errors: `catch (err: unknown) { const e = err as Error; ... }`
- Interface names: PascalCase, no `I` prefix. Prefer `interface` over `type` for object shapes.
- All API response shapes get their own typed interface (see `AdminDashboard.tsx` pattern).

## React components

- All components in `app/` and `components/` are `'use client'` — there are no server components except layouts.
- Component files export a single named function (not default except in `app/` pages).
- State: `useState` for local UI state. `useEffect` + `apiFetch` for data loading — no SWR, no React Query in components (React Query is only for wagmi internals).
- Loading states: show a skeleton or spinner — never show stale data.
- Error states: red `bg-red-900/20 border-red-700/50` card with `text-red-400 text-sm` message.

## Styling

- Dark background: `bg-[#0a0d14]` (page) / `bg-[#0f1219]` (sidebar, cards)
- Card component: use `.card` class from `globals.css`
- Primary buttons: `.btn-primary` — purple gradient
- Secondary/ghost buttons: `text-gray-400 hover:text-white hover:bg-gray-800/50` inline
- Active tab: `bg-purple-600/20 text-purple-400`
- Inactive tab: `text-gray-400 hover:text-white hover:bg-gray-800/50`
- Status colors: `green-400` (active/success), `amber-400` (pending), `red-400` (rejected/error), `blue-400` (in-progress)
- Monospace addresses: `font-mono text-xs text-gray-400`

## API calls

- Always use `apiFetch` from `@/lib/api` — never raw `fetch` for backend calls (no JWT otherwise).
- Wrap in try/catch. Catch type is `unknown`; cast to `Error` to read `.message`.
- PUT/POST bodies: always `JSON.stringify(data)` — `apiFetch` sets `Content-Type: application/json`.

## Blockchain reads

- `useReadContract` from wagmi for all on-chain reads. Pass `chainId` explicitly.
- `useConvexoWrite` from `@/lib/hooks/useConvexoWrite` for writes (= `useWriteContract` under the hood).
- Never call `useWriteContract` directly — import via `useConvexoWrite` for consistency.

## Naming

- Use "onchain" (one word, no hyphen) in comments and strings.
- Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities/hooks.
- API fetch functions inside components: prefix with `fetch` (e.g., `fetchStats`, `fetchVerifications`).

## No comments unless the why is non-obvious

The `lib/auth.ts` comment "never use wagmi signMessage" is a good example — it explains a non-obvious constraint. Don't comment what the code already says.
