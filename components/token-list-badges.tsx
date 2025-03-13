import { Chain, Token } from '@/constants/ChainToken'
import Image from 'next/image'

interface TokenListBadgesProps {
  token?: Token
  chain?: Chain
  size?: 'sm' | 'md' | 'lg'
}

export function TokenListBadges({ 
  token = {
    symbol: 'USDC',
    name: 'USD Coin',
    logoUrl: '/tokens/usdc.svg',
    address: '0x0',
    decimals: 6
  },
  chain = {
    id: 1,
    name: 'Arbitrum',
    logoUrl: '/chains/arb.svg',
    nativeCurrency: 'ETH',
    rpcUrl: ''
  },
  size = 'md'
}: TokenListBadgesProps) {
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      token: 'w-7 h-7',
      network: 'w-4 h-4 -bottom-0.5 -right-0.5'
    },
    md: {
      container: 'w-12 h-12',
      token: 'w-10 h-10',
      network: 'w-6 h-6 -bottom-1 -right-1'
    },
    lg: {
      container: 'w-16 h-16',
      token: 'w-14 h-14',
      network: 'w-8 h-8 -bottom-1 -right-1'
    }
  }

  return (
    <div className={`relative ${sizes[size].container}`}>
      {/* Token circle */}
      <div className="w-full h-full rounded-full bg-transparent flex items-center justify-center">
        <Image 
          src={token.logoUrl}
          alt={token.symbol}
          width={size === 'sm' ? 28 : size === 'md' ? 40 : 56}
          height={size === 'sm' ? 28 : size === 'md' ? 40 : 56}
          className={`${sizes[size].token} object-contain`}
        />
      </div>
      
      {/* Network badge overlay */}
      <div className={`absolute ${sizes[size].network} rounded-full flex items-center justify-center bg-white`}>
        <Image 
          src={chain.logoUrl}
          alt={chain.name}
          width={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
          height={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  )
}