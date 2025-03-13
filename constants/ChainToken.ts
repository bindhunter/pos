import { Address } from "viem";

export enum ChainId {
  ETHEREUM = 1,
  BASE = 8453,
  OPTIMISM = 10,
  ARBITRUM = 42161,
  // BITCOIN = 20000000000001,
  SOLANA = 1151111081099710,
  AVALANCHE = 43114,
  POLYGON = 137,
  LINEA = 59144,
  SCROLL = 534352,
}

export interface Chain {
  id: ChainId;
  name: string;
  nativeCurrency: string;
  logoUrl: string;
  rpcUrl?: string;
}

export interface Token {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  logoUrl: string;
}

export interface TokenBalances {
  balances: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export interface ExtendedToken extends Token {
  network: string;
  amount: string;
  value: string;
  chain: Chain;
}