import { chains, tokens } from '@/constants/ChainTokenData';
import { ChainId, ExtendedToken, Token, Chain } from '@/constants/ChainToken';
import { Address } from 'viem';

export function getTokenDetails(tokenAddress: Address, chainId: ChainId): Token | null {
  const chainTokens = tokens[chainId];
  if (!chainTokens) return null;

  const token = chainTokens.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return token || null;
}

export function getChainDetails(chainId: ChainId): Chain | null {
  const chain = chains[chainId];
  return chain || null;
}

/**
 * Gets the token symbol for a given token address and chain ID
 * @param tokenAddress - The token's contract address
 * @param chainId - The chain ID where the token exists
 * @returns The token symbol or null if not found
 */

export function getTokenSymbol(tokenAddress: Address, chainId: ChainId): string | null {
  const chainTokens = tokens[chainId];
  if (!chainTokens) return null;

  const token = chainTokens.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  return token?.symbol || null;
}

/**
 * Gets the network name for a given chain ID
 * @param chainId - The chain ID to look up
 * @returns The network name or null if not found
 */
export function getNetworkName(chainId: ChainId): string | null {
  const chain = chains[chainId];
  return chain?.name || null;
}