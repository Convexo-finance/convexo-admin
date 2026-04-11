import { createConfig, http } from 'wagmi';
import { mainnet, base, sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
