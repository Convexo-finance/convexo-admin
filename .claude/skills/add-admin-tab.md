# add-admin-tab — Add a new tab to the admin dashboard

trigger: User asks to add a new section, tab, or panel to the admin dashboard

---

## Steps

1. **Define the tab** in `app/dashboard/page.tsx`:
   ```typescript
   // Add to Tab type union
   type Tab = '...' | 'new-tab'
   
   // Add to tabs array
   { id: 'new-tab', name: 'Tab Label', icon: SomeHeroIcon }
   ```

2. **Create the component** in `components/admin/NewTabView.tsx`:
   ```typescript
   'use client'
   import { useEffect, useState } from 'react'
   import { apiFetch } from '@/lib/api'
   
   interface Item { id: string; /* ... */ }
   interface Response { data: Item[]; total: number }
   
   export function NewTabView() {
     const [items, setItems] = useState<Item[]>([])
     const [loading, setLoading] = useState(true)
     const [error, setError] = useState('')
   
     useEffect(() => {
       apiFetch<Response>('/admin/new-resource')
         .then(res => setItems(res.data))
         .catch(err => setError((err as Error).message))
         .finally(() => setLoading(false))
     }, [])
   
     // ... render
   }
   ```

3. **Export from barrel** in `components/admin/index.tsx`.

4. **Render in dashboard** in `app/dashboard/page.tsx`:
   ```typescript
   import { NewTabView } from '@/components/admin'
   // ...
   {tab === 'new-tab' && <NewTabView />}
   ```

5. **Check the backend API** the tab will call:
   - Is there a corresponding `GET /admin/<resource>` route?
   - Does it require `requireAdmin('VIEWER')` or `requireAdmin('VERIFIER')`?
   - What is the response shape? Define a TypeScript interface to match.

6. **Run type-check** and append to CHANGELOG.md.

## Rules

- Never fetch without JWT — always use `apiFetch`, never raw `fetch`
- Always handle loading and error states
- Use the same color/card/button patterns as existing tabs (see `AdminDashboard.tsx` as reference)
- No hardcoded chain IDs — use `useChainId()` from wagmi

## MCP to activate

- `context7`: if the tab needs new wagmi/viem patterns
