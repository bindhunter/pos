"use client";

import { WagmiProvider, createConfig } from 'wagmi';
import { mainnet, sepolia, optimism, arbitrum, base, avalanche, polygon } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'wagmi';
import { ReactNode, useState } from 'react';

export function ClientProviders({ children }: { children: ReactNode }) {
  // Create the query client inside the component
  const [queryClient] = useState(() => new QueryClient());
  
  // Create config inside the component
  const [config] = useState(() => 
    createConfig({
      chains: [mainnet, sepolia, optimism, arbitrum, base, avalanche, polygon],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
        [optimism.id]: http(),
        [arbitrum.id]: http(),
        [base.id]: http(),
        [avalanche.id]: http(),
        [polygon.id]: http(),
      },
    })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}