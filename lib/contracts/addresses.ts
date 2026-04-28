// Multi-chain contract addresses — convexo.v3.18
// Source of truth: addresses.json — DO NOT EDIT MANUALLY
// Run: node scripts/sync-addresses.js

export type ChainId = 8453 | 130 | 42161 | 1 | 84532 | 11155111 | 1301 | 421614;

export interface ChainContracts {
  CHAIN_ID: ChainId;
  CHAIN_NAME: string;
  // NFT / Identity
  CONVEXO_PASSPORT: `0x${string}`;
  LP_INDIVIDUALS: `0x${string}`;
  LP_BUSINESS: `0x${string}`;
  ECREDITSCORING: `0x${string}`;
  REPUTATION_MANAGER: `0x${string}`;
  // Core protocol
  VAULT_FACTORY: `0x${string}`;
  CONTRACT_SIGNER: `0x${string}`;
  // Verification
  VERIFF_VERIFIER: `0x${string}`;
  SUMSUB_VERIFIER: `0x${string}`;
  // Hooks & pools
  HOOK_DEPLOYER: `0x${string}`;
  PASSPORT_GATED_HOOK: `0x${string}`;
  POOL_REGISTRY: `0x${string}`;
  PRICE_FEED_MANAGER: `0x${string}`;
  // Tokens
  USDC: `0x${string}`;
  EURC: `0x${string}`;
  ECOP: `0x${string}`;
  // Uniswap V4 infrastructure
  POOL_MANAGER: `0x${string}`;
  UNIVERSAL_ROUTER: `0x${string}`;
  POSITION_MANAGER: `0x${string}`;
  QUOTER: `0x${string}`;
  // Other external
  ZKPASSPORT_VERIFIER: `0x${string}`;
  ADMIN_ADDRESS: `0x${string}`;
}

// ─── Deterministic addresses (same on all deployed chains via CREATE2 salt convexo.v3.18) ──

const DETERMINISTIC = {
  CONVEXO_PASSPORT:   '0x648D128c117bC83aEAAd408ab69F0E5cb6291790' as `0x${string}`,
  LP_INDIVIDUALS:     '0xE244e4B2B37EA6f6453d3154da548e7f2e1e5Df3' as `0x${string}`,
  LP_BUSINESS:        '0x70cFe52560Dc2DD981d2374bB6b01c2170E5597B' as `0x${string}`,
  ECREDITSCORING:     '0xa448Aa6bfd5bA16BBd756cAF8E2cd68b31b51D88' as `0x${string}`,
  REPUTATION_MANAGER: '0x50b81F36a95E1363288Ef44aD7E48A8CaCDFa349' as `0x${string}`,
  VERIFF_VERIFIER:    '0x5B9808554B793923ba6C6470910373ac307CeB8E' as `0x${string}`,
  SUMSUB_VERIFIER:    '0x51056F2F2aa64b439E3b9e46C1AcaAE70C5B7EFA' as `0x${string}`,
  CONTRACT_SIGNER:    '0x5ece4eE045Ff2115fE5d89e7fe277e676EDABD78' as `0x${string}`,
  POOL_REGISTRY:      '0xbab36fC5d44d95d57F378e40C538352FfEe2c5A2' as `0x${string}`,
  PRICE_FEED_MANAGER: '0xc1CE80A34C9d4B171a0B9873b296c95a7189De66' as `0x${string}`,
  HOOK_DEPLOYER:      '0x69068b03dDb9Ca72B532dB694F075D91e08fB402' as `0x${string}`,
  ZKPASSPORT_VERIFIER:'0x1D000001000EFD9a6371f4d90bB8920D5431c0D8' as `0x${string}`,
  ADMIN_ADDRESS:      '0x156d3C1648ef2f50A8de590a426360Cf6a89C6f8' as `0x${string}`,
  ZERO:               '0x0000000000000000000000000000000000000000' as `0x${string}`,
};

export const CONTRACTS: Record<ChainId, ChainContracts> = {

  // ── Base Mainnet ─────────────────────────────────────────────────────────────
  8453: {
    CHAIN_ID: 8453, CHAIN_NAME: 'Base Mainnet',
    ...DETERMINISTIC,
    PASSPORT_GATED_HOOK: '0x04E3281B87321aD1dCF9ed9edB9BeE6268EB12f3',
    VAULT_FACTORY:       '0x8E9dC18eFBD99A059785f388cb21A901C0b50698',
    USDC:             '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    EURC:             '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
    ECOP:             '0x2d7d0fd51f14cb3fe86e15a944acdc7ae121acbe',
    POOL_MANAGER:     '0x498581fF718922c3f8e6A244956aF099B2652b2b',
    UNIVERSAL_ROUTER: '0x6ff5693b99212da76ad316178a184ab56d299b43',
    POSITION_MANAGER: '0x7c5f5a4bbd8fd63184577525326123b519429bdc',
    QUOTER:           '0x0d5e0f971ed27fbff6c2837bf31316121532048d',
  },

  // ── Unichain Mainnet ─────────────────────────────────────────────────────────
  130: {
    CHAIN_ID: 130, CHAIN_NAME: 'Unichain Mainnet',
    ...DETERMINISTIC,
    PASSPORT_GATED_HOOK: '0x7Fd7139CeEf35A936977cF152c2AB9AF42ba942D',
    VAULT_FACTORY:       '0xF77816C65769FeC9a3B35A8DC1818DeE1185A283',
    USDC:             '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    EURC:             DETERMINISTIC.ZERO,
    ECOP:             '0x8d54238aed827a6d26f60efae5c855c205622e79',
    POOL_MANAGER:     '0x1F98400000000000000000000000000000000004',
    UNIVERSAL_ROUTER: '0xef740bf23acae26f6492b10de645d6b98dc8eaf3',
    POSITION_MANAGER: '0x4529a01c7a0410167c5740c487a8de60232617bf',
    QUOTER:           '0x333e3c607b141b18ff6de9f258db6e77fe7491e0',
  },

  // ── Arbitrum One (ECOP deployed; full protocol pending) ──────────────────────
  42161: {
    CHAIN_ID: 42161, CHAIN_NAME: 'Arbitrum One',
    ...DETERMINISTIC,
    CONVEXO_PASSPORT:   DETERMINISTIC.ZERO,
    LP_INDIVIDUALS:     DETERMINISTIC.ZERO,
    LP_BUSINESS:        DETERMINISTIC.ZERO,
    ECREDITSCORING:     DETERMINISTIC.ZERO,
    REPUTATION_MANAGER: DETERMINISTIC.ZERO,
    VERIFF_VERIFIER:    DETERMINISTIC.ZERO,
    SUMSUB_VERIFIER:    DETERMINISTIC.ZERO,
    CONTRACT_SIGNER:    DETERMINISTIC.ZERO,
    POOL_REGISTRY:      DETERMINISTIC.ZERO,
    PRICE_FEED_MANAGER: DETERMINISTIC.ZERO,
    HOOK_DEPLOYER:      DETERMINISTIC.ZERO,
    PASSPORT_GATED_HOOK:DETERMINISTIC.ZERO,
    VAULT_FACTORY:      DETERMINISTIC.ZERO,
    USDC:             '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    EURC:             '0x72A9c57cD5E2Ff20450e409cF6A542f1E6c710fc',
    ECOP:             '0xedb7068a83dcc9c437bed70a979df62396c53c12',
    POOL_MANAGER:     '0xC81462Fec8B23319F288047f8A03A57682a35C1A',
    UNIVERSAL_ROUTER: '0xa51afafe0263b40edaef0df8781ea9aa03e381a3',
    POSITION_MANAGER: '0xd88f38f930b7952f2db2432cb002e7abbf3dd869',
    QUOTER:           '0x3972c00f7ed4885e145823eb7c655375d275a1c5',
    ZKPASSPORT_VERIFIER: DETERMINISTIC.ZERO,
  },

  // ── Ethereum Mainnet (full protocol coming soon) ──────────────────────────────
  1: {
    CHAIN_ID: 1, CHAIN_NAME: 'Ethereum Mainnet',
    ...DETERMINISTIC,
    CONVEXO_PASSPORT:   DETERMINISTIC.ZERO,
    LP_INDIVIDUALS:     DETERMINISTIC.ZERO,
    LP_BUSINESS:        DETERMINISTIC.ZERO,
    ECREDITSCORING:     DETERMINISTIC.ZERO,
    REPUTATION_MANAGER: DETERMINISTIC.ZERO,
    VERIFF_VERIFIER:    DETERMINISTIC.ZERO,
    SUMSUB_VERIFIER:    DETERMINISTIC.ZERO,
    CONTRACT_SIGNER:    DETERMINISTIC.ZERO,
    POOL_REGISTRY:      DETERMINISTIC.ZERO,
    PRICE_FEED_MANAGER: DETERMINISTIC.ZERO,
    HOOK_DEPLOYER:      DETERMINISTIC.ZERO,
    PASSPORT_GATED_HOOK:DETERMINISTIC.ZERO,
    VAULT_FACTORY:      DETERMINISTIC.ZERO,
    USDC:             '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    EURC:             '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
    ECOP:             '0xff404bd4f52784fc3ddfa4a064e096bb8c84f7bf',
    POOL_MANAGER:     '0x000000000004444c5dc75cB358380D2e3dE08A90',
    UNIVERSAL_ROUTER: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
    POSITION_MANAGER: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e',
    QUOTER:           '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',
  },

  // ── Base Sepolia ─────────────────────────────────────────────────────────────
  84532: {
    CHAIN_ID: 84532, CHAIN_NAME: 'Base Sepolia',
    ...DETERMINISTIC,
    PASSPORT_GATED_HOOK: '0xdCfF77e89904e9Bead3f456D04629Ca8Eb7e8a80',
    VAULT_FACTORY:       '0x40Fa2aCCd9eb44ad154Da2ca84519E899D8E22Ae',
    USDC:             '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    EURC:             DETERMINISTIC.ZERO,
    ECOP:             '0xb934dcb57fb0673b7bc0fca590c5508f1cde955d',
    POOL_MANAGER:     '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    UNIVERSAL_ROUTER: '0x492e6456d9528771018deb9e87ef7750ef184104',
    POSITION_MANAGER: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
    QUOTER:           '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
  },

  // ── Ethereum Sepolia (v3.19 — devMode expiry guard, pool reseeded with both tokens) ───
  11155111: {
    CHAIN_ID: 11155111, CHAIN_NAME: 'Ethereum Sepolia',
    ...DETERMINISTIC,
    CONVEXO_PASSPORT:   '0xCde95545f2446C2CfdDA7439493AD453014AC562',
    REPUTATION_MANAGER: '0x28a9b3bA5ddf3D7542a2BCC00Bc7eC72363bEB8b',
    PASSPORT_GATED_HOOK:'0xd3f980f48638783a8324ff99301028f08bda8a80',
    VAULT_FACTORY:       '0x3D0290F255D4eB1EFe1384618a827C2E26b0df67',
    USDC:             '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    EURC:             DETERMINISTIC.ZERO,
    ECOP:             '0x19ac2612e560b2bbedf88660a2566ef53c0a15a1',
    POOL_MANAGER:     '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    UNIVERSAL_ROUTER: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
    POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    QUOTER:           '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
  },

  // ── Unichain Sepolia ─────────────────────────────────────────────────────────
  1301: {
    CHAIN_ID: 1301, CHAIN_NAME: 'Unichain Sepolia',
    ...DETERMINISTIC,
    PASSPORT_GATED_HOOK: '0x1d5640dE9DD12Da7F9F0b2f48108269B942528f0',
    VAULT_FACTORY:       '0x794F7434e43d561D847008f39994b0215c489B3D',
    USDC:             '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    EURC:             DETERMINISTIC.ZERO,
    ECOP:             '0xbb0d7c4141ee1fed53db766e1ffcb9c618df8260',
    POOL_MANAGER:     '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
    UNIVERSAL_ROUTER: '0xf70536b3bcc1bd1a972dc186a2cf84cc6da6be5d',
    POSITION_MANAGER: '0xf969aee60879c54baaed9f3ed26147db216fd664',
    QUOTER:           '0x56dcd40a3f2d466f48e7f48bdbe5cc9b92ae4472',
  },

  // ── Arbitrum Sepolia ─────────────────────────────────────────────────────────
  421614: {
    CHAIN_ID: 421614, CHAIN_NAME: 'Arbitrum Sepolia',
    ...DETERMINISTIC,
    PASSPORT_GATED_HOOK: '0x0f850ea18491168362bc791e5171c1df163e0a80',
    VAULT_FACTORY:       '0x35a9d48ea707a30bae26501c491f86641f6c003d',
    USDC:             '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    EURC:             DETERMINISTIC.ZERO,
    ECOP:             '0x284d760b6fbb064e635c1f59ca0ef51490c93a06',
    POOL_MANAGER:     '0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317',
    UNIVERSAL_ROUTER: '0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47',
    POSITION_MANAGER: '0xAc631556d3d4019C95769033B5E719dD77124BAc',
    QUOTER:           '0x7de51022d70a725b508085468052e25e22b5c4c9',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getContractsForChain(chainId: number): ChainContracts | null {
  return chainId in CONTRACTS ? CONTRACTS[chainId as ChainId] : null;
}

export function isSupportedChain(chainId: number): chainId is ChainId {
  return chainId in CONTRACTS;
}

export function getChainName(chainId: number): string {
  return getContractsForChain(chainId)?.CHAIN_NAME ?? 'Unknown Chain';
}

/** Returns true if the chain has the full protocol deployed (non-zero passport address). */
export function hasFullProtocol(chainId: number): boolean {
  const c = getContractsForChain(chainId);
  return !!c && c.CONVEXO_PASSPORT !== '0x0000000000000000000000000000000000000000';
}

export const SUPPORTED_CHAIN_IDS: ChainId[] = [8453, 130, 42161, 1, 84532, 11155111, 1301, 421614];
export const MAINNET_CHAIN_IDS: ChainId[] = [8453, 130, 42161, 1];
export const TESTNET_CHAIN_IDS: ChainId[] = [84532, 11155111, 1301, 421614];
export const ZKPASSPORT_CHAIN_IDS: ChainId[] = [8453, 1, 84532, 11155111];
export const PRIMARY_MAINNET_CHAIN_ID: ChainId = 8453;
export const PRIMARY_TESTNET_CHAIN_ID: ChainId = 11155111;

export const BLOCK_EXPLORERS: Record<ChainId, string> = {
  8453:    'https://basescan.org',
  130:     'https://unichain.blockscout.com',
  42161:   'https://arbiscan.io',
  1:       'https://etherscan.io',
  84532:   'https://sepolia.basescan.org',
  11155111:'https://sepolia.etherscan.io',
  1301:    'https://unichain-sepolia.blockscout.com',
  421614:  'https://sepolia.arbiscan.io',
};

export function getBlockExplorerUrl(chainId: number): string {
  return BLOCK_EXPLORERS[chainId as ChainId] ?? '';
}

export function getAddressExplorerLink(chainId: number, address: string): string {
  const base = getBlockExplorerUrl(chainId);
  return base ? `${base}/address/${address}` : '';
}

export function getTxExplorerLink(chainId: number, txHash: string): string {
  const base = getBlockExplorerUrl(chainId);
  return base ? `${base}/tx/${txHash}` : '';
}

// ─── Standard ERC-20 ABI ──────────────────────────────────────────────────────

export const ERC20_ABI = [
  { constant: true,  inputs: [{ name: 'owner',   type: 'address' }], name: 'balanceOf',  outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: true,  inputs: [{ name: 'owner',   type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: false, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount',  type: 'uint256' }], name: 'approve',   outputs: [{ name: '', type: 'bool'    }], type: 'function' },
  { constant: false, inputs: [{ name: 'to',      type: 'address' }, { name: 'amount',  type: 'uint256' }], name: 'transfer',  outputs: [{ name: '', type: 'bool'    }], type: 'function' },
  { constant: true,  inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8'  }], type: 'function' },
  { constant: true,  inputs: [], name: 'symbol',   outputs: [{ name: '', type: 'string' }], type: 'function' },
] as const;

// ─── IPFS ─────────────────────────────────────────────────────────────────────

export const IPFS = {
  CONVEXO_PASSPORT_HASH: 'bafybeiekwlyujx32cr5u3ixt5esfxhusalt5ljtrmsng74q7k45tilugh4',
  LP_INDIVIDUALS_HASH:   'bafkreib7mkjzpdm3id6st6d5vsxpn7v5h6sxeiswejjmrbcb5yoagaf4em',
  LP_BUSINESS_HASH:      'bafkreiejesvgsvohwvv7q5twszrbu5z6dnpke6sg5cdiwgn2rq7dilu33m',
  ECREDITSCORING_HASH:   'bafkreignxas6gqi7it5ng6muoykujxlgxxc4g7rr6sqvwgdfwveqf2zw3e',
  CONVEXO_PASSPORT_URI:  'ipfs://bafybeiekwlyujx32cr5u3ixt5esfxhusalt5ljtrmsng74q7k45tilugh4',
  LP_INDIVIDUALS_URI:    'ipfs://bafkreib7mkjzpdm3id6st6d5vsxpn7v5h6sxeiswejjmrbcb5yoagaf4em',
  LP_BUSINESS_URI:       'ipfs://bafkreiejesvgsvohwvv7q5twszrbu5z6dnpke6sg5cdiwgn2rq7dilu33m',
  ECREDITSCORING_URI:    'ipfs://bafkreignxas6gqi7it5ng6muoykujxlgxxc4g7rr6sqvwgdfwveqf2zw3e',
} as const;

// Permit2 — same address on all chains
export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`;

export function getIPFSUrl(hash: string): string {
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'lime-famous-condor-7.mypinata.cloud';
  return `https://${gateway}/ipfs/${hash}`;
}
