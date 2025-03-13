'use server'

import { getTokenBalances } from '@/lib/token-balance-utils';
import { Address } from 'viem';
import { ChainId } from '@/constants/ChainToken';
import { PRIORITIZED_CHAIN_ORDER } from '@/lib/chains';

export async function fetchWalletBalances(walletAddress: string) {
  // Fetch all chain balances in parallel
  const chainBalancesPromises = PRIORITIZED_CHAIN_ORDER.map(chainId => 
    getTokenBalances(walletAddress as Address, chainId)
  );

  const chainBalances = await Promise.all(chainBalancesPromises);
  
  // Create balances object
  return PRIORITIZED_CHAIN_ORDER.reduce((acc, chainId, index) => {
    acc[chainId] = chainBalances[index];
    return acc;
  }, {} as Record<ChainId, Record<string, string>>);
} 