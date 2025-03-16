"use client"

import { createAppKit } from '@reown/appkit/react'

import { WagmiProvider } from 'wagmi'
import { arbitrum, base, optimism, avalanche, polygon, mainnet } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.reown.com
const projectId = 'c19ead71bcf2d1cd5b078fd616c83e92'

// 2. Create a metadata object - optional
const metadata = {
  name: 'Merchant-Demo',
  description: 'Create merchant account & test checkout flow.',
  url: 'https://commerce-bindpay.vercel.app/', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// 3. Set the networks
const networks = [arbitrum, base, optimism, avalanche, polygon, mainnet]

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
});

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  themeVariables: {
    '--w3m-accent': 'var(--secondary)',
  },
  features: {
    analytics: false,
    swaps: false,     // Disable swaps feature
    onramp: false,    // Disable on-ramp feature
    connectMethodsOrder: ['wallet'],
  }
})

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
    