# Web3 Patterns — Convexo Admin

Rules for onchain interactions specific to this codebase.

---

## Wallet connection

This app uses **RainbowKit v2** for wallet connection. The connected wallet is always an EOA — no smart accounts.

```typescript
// Reading connected state
const { address, isConnected, connector } = useAccount()
const chainId = useChainId()

// Getting provider for signing (works for all wallet types)
const provider = await connector?.getProvider()
```

Never use `window.ethereum` directly after wallet connect — it only exists for injected wallets. WalletConnect and Coinbase Wallet have their own provider instances accessible only via `connector.getProvider()`.

## SIWE signing

Pattern in `lib/auth.ts` — do not change it:
1. `GET /auth/nonce?address=<wallet>` → nonce string
2. `createSiweMessage(...)` from `viem/siwe`
3. `provider.request({ method: 'personal_sign', params: [message, address] })`
4. `POST /auth/verify` with `authMethod: 'METAMASK'`

## Contract reads

```typescript
import { useReadContract, useChainId } from 'wagmi'
import { getContractsForChain } from '@/lib/contracts/addresses'
import { ABIS } from '@/lib/contracts/abis'

const chainId = useChainId()
const contracts = getContractsForChain(chainId)

const { data } = useReadContract({
  address: contracts?.LP_INDIVIDUALS,
  abi: ABIS.LP_INDIVIDUALS,
  functionName: 'balanceOf',
  args: [userAddress],
  chainId,
})
```

## Contract writes

```typescript
import { useConvexoWrite } from '@/lib/hooks/useConvexoWrite'

const { writeContract, isPending, isSuccess, error } = useConvexoWrite()

writeContract({
  address: contracts.LP_INDIVIDUALS,
  abi: ABIS.LP_INDIVIDUALS,
  functionName: 'mintTo',
  args: [recipientAddress],
})
```

## Chain ID and network mode

- `NEXT_PUBLIC_NETWORK_MODE=mainnet` → primary chain is Base (8453)
- `NEXT_PUBLIC_NETWORK_MODE=testnet` → primary chain is ETH Sepolia (11155111)
- `getContractsForChain(chainId)` returns `null` for unsupported chains — always null-check
- `hasFullProtocol(chainId)` → true only if CONVEXO_PASSPORT is non-zero on that chain

## Address display

- Always shorten: `${addr.slice(0, 6)}…${addr.slice(-4)}`
- Link to block explorer: `getAddressExplorerLink(chainId, address)` from `lib/contracts/addresses`
- Use `font-mono text-xs text-gray-400` for displayed addresses

## Token amounts

- USDC: 6 decimals (NOT 18 — critical, common mistake)
- ECOP: 18 decimals
- EURC: 6 decimals
- Always use `formatUnits(amount, decimals)` from viem to display, never divide by 1e18 hardcoded
