import { createPublicClient, http, formatUnits, Address } from 'viem';
import { ChainId, Token, Chain } from '@/constants/ChainToken';
import { chains, tokens } from '@/constants/ChainTokenData';
import { ChainType, chainIdToChainType } from '@/lib/address-validation';

const erc20Abi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

function getViemChain(chainId: ChainId): Chain {
  const chain = chains[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);
  return chain;
}

async function getSolanaTokenBalance(walletAddress: string, tokenAddress: string): Promise<string> {
  // TODO: Implement Solana token balance fetching
  // This would use @solana/web3.js
  console.log('Solana balance checking not implemented yet');
  return '0';
}

export async function getTokenBalances(address: Address, chainId: ChainId): Promise<Record<string, string>> {
  // console.log(`Fetching balances for chain ${chainId} and address ${address}`);
  const chainType = chainIdToChainType(chainId);
  const chain = getViemChain(chainId);
  const chainTokens = tokens[chainId] || [];
  const balances: Record<string, string> = {};

  // console.log(`Chain type: ${chainType}, Chain tokens:`, chainTokens);

  // Handle Solana differently
  // if (chainType === ChainType.Solana) {
  //   console.log('Processing Solana chain...');
  //   for (const token of chainTokens) {
  //     try {
  //       balances[token.symbol] = await getSolanaTokenBalance(address, token.address);
  //       console.log(`Solana ${token.symbol} balance:`, balances[token.symbol]);
  //     } catch (error) {
  //       console.error(`Error fetching Solana balance for ${token.symbol}:`, error);
  //       balances[token.symbol] = '0';
  //     }
  //   }
  //   return balances;
  // }

  // Handle EVM chains
  if (!chain.rpcUrl) {
    console.error(`No RPC URL available for chain ID: ${chainId}`);
    return {};
  }

  const client = createPublicClient({
    chain: chain as any,
    transport: http(chain.rpcUrl),
  });

  for (const token of chainTokens) {
    try {
      if (token.address === '0x0000000000000000000000000000000000000000') {
        // Native token balance
        const balance = await client.getBalance({ address });
        balances[token.symbol] = formatUnits(balance, token.decimals);
        // console.log(`Native ${token.symbol} balance:`, balances[token.symbol]);
      } else {
        // ERC20 token balance
        const balance = await client.readContract({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        });
        balances[token.symbol] = formatUnits(balance, token.decimals);
        // console.log(`ERC20 ${token.symbol} balance:`, balances[token.symbol]);
      }
    } catch (error) {
      // console.error(`Error fetching balance for ${token.symbol}:`, error);
      balances[token.symbol] = '0';
    }
  }

  // console.log(`Final balances for chain ${chainId}:`, balances);
  return balances;
}