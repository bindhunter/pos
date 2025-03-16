'use client'

import { useEffect } from 'react'

export default function AppKitClient() {
  useEffect(() => {
    // Initialize AppKit only on the client side
    const initAppKit = async () => {
      try {
        const { createAppKit } = await import('@reown/appkit/react')
        const { WagmiAdapter } = await import('@reown/appkit-adapter-wagmi')
        const { arbitrum, base, optimism, avalanche, polygon, mainnet } = await import('@reown/appkit/networks')

        const projectId = 'c19ead71bcf2d1cd5b078fd616c83e92'
        
        const metadata = {
          name: 'Merchant-Demo',
          description: 'Create merchant account & test checkout flow.',
          url: 'https://commerce-bindpay.vercel.app/',
          icons: ['https://assets.reown.com/reown-profile-pic.png']
        }
        
        const networks = [arbitrum, base, optimism, avalanche, polygon, mainnet]
        
        const wagmiAdapter = new WagmiAdapter({
          networks,
          projectId,
          ssr: false // Important: set to false to avoid SSR issues
        })
        
        createAppKit({
          adapters: [wagmiAdapter],
          networks,
          projectId,
          metadata,
          features: {
            analytics: false
          }
        })
      } catch (error) {
        console.error('Failed to initialize AppKit:', error)
      }
    }
    
    initAppKit()
  }, [])
  
  return null // This component doesn't render anything
}