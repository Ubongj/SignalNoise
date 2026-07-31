import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

/**
 * wagmi + RainbowKit config, targeting Arbitrum Sepolia (CoFHE's primary
 * testnet). A WalletConnect projectId enables the mobile/WalletConnect flow;
 * injected wallets (MetaMask, etc.) work without it.
 *
 * Get a free projectId at https://cloud.walletconnect.com and set
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'Signal vs Noise',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'signal_vs_noise_dev',
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
  ssr: false,
});

export const targetChain = arbitrumSepolia;
