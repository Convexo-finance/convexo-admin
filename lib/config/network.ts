const mode = (process.env.NEXT_PUBLIC_NETWORK_MODE ?? 'testnet') as 'mainnet' | 'testnet';

export const NETWORK_MODE = mode;
export const IS_MAINNET = mode === 'mainnet';

// Primary chain for all contract reads/writes
export const PRIMARY_CHAIN_ID: 8453 | 11155111 = IS_MAINNET ? 8453 : 11155111;
export const PRIMARY_CHAIN_NAME = IS_MAINNET ? 'Base Mainnet' : 'Ethereum Sepolia';
