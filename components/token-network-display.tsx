import Image from 'next/image'
import { Wallet } from 'lucide-react'
import { tokens, chains } from '@/constants/ChainTokenData'
import { getNetworkName, getTokenSymbol } from '@/lib/token-chain-parser';
import { ChainId } from '@/constants/ChainToken';
import { Address } from 'viem';

interface TokenNetworkDisplayProps {
  tokenAddress: Address | string | undefined;
  chainId: string | ChainId | undefined;
  size?: 'sm' | 'md' | 'lg'
}

export function TokenNetworkDisplay({ 
  tokenAddress,
  chainId,
  size = 'md'
}: TokenNetworkDisplayProps) {

  const tokenSymbol = getTokenSymbol(tokenAddress as Address, chainId as unknown as ChainId)
  const chainName = getNetworkName(chainId as unknown as ChainId)

  // Find the chain from our constants
  const chain = Object.values(chains).find(
    (c) => c.name.toLowerCase() === chainName?.toLowerCase()
  );

  // Find the token by flattening all tokens and searching by symbol
  const token = Object.values(tokens)
    .flat()
    .find(t => t.symbol.toLowerCase() === tokenSymbol?.toLowerCase());

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
        {token?.logoUrl ? (
          <Image 
            src={token.logoUrl}
            alt={tokenSymbol || "Token"}
            width={size === 'sm' ? 28 : size === 'md' ? 40 : 56}
            height={size === 'sm' ? 28 : size === 'md' ? 40 : 56}
            className={`${sizes[size].token} object-contain`}
          />
        ) : (
          <div className={`${sizes[size].token} bg-muted rounded-full flex items-center justify-center`}>
            <Wallet className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'} text-muted-foreground`} />
          </div>
        )}
      </div>
      
      {chain && (
        <div className={`absolute ${sizes[size].network} rounded-full flex items-center justify-center bg-white`}>
          <Image 
            src={chain?.logoUrl || "/placeholder.svg"}
            alt={chainName || "Network"}
            width={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
            height={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  )
}