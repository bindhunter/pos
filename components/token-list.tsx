'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TokenListBadges } from '@/components/token-list-badges';
import { chains, tokens } from '@/constants/ChainTokenData';
import { ChainId, ExtendedToken } from '@/constants/ChainToken';
import { useEffect, useState, useMemo } from 'react';
import { getTokenPrices } from '@/lib/token-prices';
import { Address } from 'viem';
import { Skeleton } from '@/components/ui/skeleton';
import { useSwitchChain } from 'wagmi';
import { toast } from 'sonner';

interface TokenListProps {
  walletAddress: string;
  onSelect: (token: ExtendedToken) => void;
  onClose: () => void;
  initialBalances: Record<ChainId, Record<string, string>>;
}

export function TokenList({ walletAddress, onSelect, onClose, initialBalances }: TokenListProps) {
  const [balances, setBalances] = useState<Record<ChainId, Record<string, string>>>(initialBalances);
  const [loadingChains, setLoadingChains] = useState<Set<ChainId>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const { switchChain, chains: configuredChains } = useSwitchChain();

  // Transform and merge tokens with available balances, filtering out zero balances
  const flattenedTokens: ExtendedToken[] = useMemo(
    () =>
      Object.entries(tokens).flatMap(([chainId, chainTokens]) => {
        const chain = chains[chainId as unknown as ChainId];
        const chainBalances = balances[chainId as unknown as ChainId] || {};

        return (
          chainTokens
            ?.map((token) => {
              const amount = chainBalances[token.symbol] || '0';
              const priceKey = `${chainId}_${token.address}`;
              const price = tokenPrices[priceKey];
              // Convert value to string to match ExtendedToken type
              const valueNum = price !== undefined ? price * parseFloat(amount) : 0;
              const value = valueNum ? `$${valueNum.toFixed(2)}` : '';

              return {
                ...token,
                chain,
                network: chain.name,
                amount,
                value, // Now this is a string, not string | undefined
              };
            })
            .filter((token) => token.amount !== '0') ?? []
        );
      }),
    [balances, tokenPrices]
  );

  // Fetch prices for tokens with non-zero balances
  useEffect(() => {
    async function fetchPrices() {
      const tokensToFetch = flattenedTokens.map((token) => ({
        chainId: token.chain.id,
        address: token.address,
      }));

      if (tokensToFetch.length > 0) {
        try {
          setLoadingPrices(true);
          const prices = await getTokenPrices(tokensToFetch);
          setTokenPrices(prices);
        } catch (error) {
          console.error('Error fetching token prices:', error);
        } finally {
          setLoadingPrices(false);
        }
      }
    }

    fetchPrices();
  }, [flattenedTokens.map((t) => `${t.chain.id}_${t.address}`).join(',')]);

  // Filter tokens based on search query
  const filteredTokens = useMemo(
    () =>
      flattenedTokens.filter((token) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          token.symbol.toLowerCase().includes(searchLower) ||
          token.name.toLowerCase().includes(searchLower) ||
          token.network.toLowerCase().includes(searchLower)
        );
      }),
    [flattenedTokens, searchQuery]
  );

  const handleTokenSelect = async (token: ExtendedToken) => {
    try {
      onSelect(token);
    } catch (error: any) {
      console.error('Failed to switch chain:', error);
      toast.error('Failed to switch network. Please try again.');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-none" autoFocus={false} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-4 text-foreground">Choose Payment Option</DialogTitle>
        </DialogHeader>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search Network or Token"
            className="pl-10 h-12 text-lg bg-card border border-foreground focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={false}
          />
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {/* Show loaded tokens */}
          {filteredTokens.map((token, index) => (
            <Button
              key={`${token.network}-${token.symbol}-${index}`}
              variant="ghost"
              className="w-full justify-between h-[72px] px-4 hover:bg-secondary"
              onClick={() => handleTokenSelect(token)}
            >
              <div className="flex items-center gap-3">
                <TokenListBadges token={token} chain={token.chain} size="md" />
                <span className="text-xl font-medium">{token.symbol}</span>
              </div>
              <div className="text-right">
                {token.value !== undefined ? (
                  <div className="text-xl font-medium">{token.value}</div>
                ) : (
                  <Skeleton className="h-7 w-24 ml-auto" />
                )}
                <div className="text-sm text-muted-foreground">
                  {token.amount} {token.symbol}
                </div>
              </div>
            </Button>
          ))}

          {/* Show skeletons for still-loading chains */}
          {loadingChains.size > 0 &&
            Array.from({ length: filteredTokens.length > 0 ? 1 : 2 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
            ))}

          {/* Show empty state only when nothing is loading and no tokens found */}
          {loadingChains.size === 0 && filteredTokens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No tokens with balance found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}