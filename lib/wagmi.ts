import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, sepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Convexo Admin',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [base, mainnet, sepolia],
  ssr: true,
});
