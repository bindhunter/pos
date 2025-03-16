'use client';

import { fetchWalletBalances } from '@/app/actions/wallet-balances';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChainId, ExtendedToken } from '@/constants/ChainToken';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { z } from 'zod';
import { QuoteResponse, usebindpayQuote } from '@/hooks/usebindpay-quote';
import { SettleFormSchema } from '@/lib/direct';
import { FeeSaveDialog } from './fee-save-dialog';
import { TokenList } from './token-list';
import { TokenNetworkDisplay } from './token-network-display';
import { useAutoChainSwitch } from '@/hooks/use-chain-switch';
import { ProgressButton } from '@/components/ui/progress-button';
import { ChevronsUpDown } from 'lucide-react';
import { chains, tokens } from '@/constants/ChainTokenData';
import { PaymentConfirmation } from './payment-confirmation';
import { PaymentSuccess } from './payment-success';

interface SettleFormProps {
  walletAddress: string;
  userId: string;
  merchantData?: {
    id: string;
    name: string;
    walletAddress: string;
    bindPayApiKey?: string;
    settlementDetails?: {
      token: string;
      network: string;
    };
  };
}

export function SettleForm({ walletAddress, userId, merchantData }: SettleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [showFeeSaveDialog, setShowFeeSaveDialog] = useState(false);
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [balances, setBalances] = useState<Record<ChainId, Record<string, string>>>(
    {} as Record<ChainId, Record<string, string>>
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [showWalletRequired, setShowWalletRequired] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<{
    transactionId: string;
    fromAmount: string;
    fromSymbol: string;
    toAmount: string;
    toSymbol: string;
    explorerUrl?: string;
    recipientName: string;
  } | null>(null);

  const currentChainId = useChainId();

  // Get URL parameters
  const requestAmount = searchParams.get('amount');
  const requestUserId = searchParams.get('user');
  const requestId = searchParams.get('request');

  type SettleFormValues = z.infer<typeof SettleFormSchema>;

  const form = useForm<SettleFormValues>({
    resolver: zodResolver(SettleFormSchema),
    defaultValues: {
      amount: requestAmount ? parseFloat(requestAmount) : 0,
      settlementDetails: undefined,
      selectedFriend: undefined,
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const {
    control,
    setValue,
    getValues,
    watch,
    handleSubmit,
    formState: { errors },
  } = form;

  const selectedChainId = watch('settlementDetails')?.chain?.id;

  // Track if this is a payment request settlement
  const isSettlingRequest = Boolean(requestAmount && requestUserId && requestId);

  // Use the merchant's API key for the quote
  const { fetchQuote, loading: quoteLoading, error: quoteError } = usebindpayQuote(
    merchantData?.bindPayApiKey
  );

  // Add new state for quote
  const [currentQuote, setCurrentQuote] = useState<QuoteResponse | null>(null);

  const handleTokenSelectorClick = () => {
    if (!watch('selectedFriend')) {
      toast.info('Select a recipient first', {
        classNames: {
          toast: 'bg-card border border-border text-foreground',
          title: 'text-foreground font-medium',
          description: 'text-gray-400',
        },
      });
      return;
    }
    setShowFeeSaveDialog(true);
  };

  const selectedFriend = getValues('selectedFriend');

  const handleTokenSelect = (token: ExtendedToken) => {
    setValue('settlementDetails', {
      token: {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        logoUrl: token.logoUrl ?? '/tokens/default.svg',
      },
      chain: {
        id: token.chain.id,
        name: token.chain.name,
        nativeCurrency: token.chain.nativeCurrency,
        logoUrl: token.chain.logoUrl ?? '/chains/default.svg',
        rpcUrl: token.chain.rpcUrl,
      },
    });
    setShowTokenSelector(false);
  };

  const handleTransaction = async (quote: QuoteResponse) => {
    if (!isConnected) {
      toast.error('Wallet not connected');
      return { success: false };
    }

    try {
      // Step 1: Handle approval transaction if needed
      if (quote.approvalTxParams) {
        toast.info('Approving token spend...', {
          duration: 10000,
          id: 'approval-toast'
        });
        
        console.log('Sending approval transaction...');
        const approvalHash = await walletClient.sendTransaction({
          account: quote.approvalTxParams.from,
          to: quote.approvalTxParams.to,
          data: quote.approvalTxParams.data,
          value: quote.approvalTxParams.value ? BigInt(quote.approvalTxParams.value) : BigInt(0),
          gas: quote.approvalTxParams.gas ? BigInt(quote.approvalTxParams.gas) : undefined,
          gasPrice: quote.approvalTxParams.gasPrice ? BigInt(quote.approvalTxParams.gasPrice) : undefined,
          nonce: quote.approvalTxParams.nonce ? Number(quote.approvalTxParams.nonce) : undefined,
        });

        console.log('Approval transaction sent:', approvalHash);
        
        // Wait for approval to be confirmed
        await publicClient?.waitForTransactionReceipt({ hash: approvalHash });
        console.log('Approval transaction confirmed');
        
        toast.success('Token approval confirmed. Proceeding with transaction...', {
          id: 'approval-toast'
        });
      }

      // Step 2: Send the main transaction
      const txParams = quote.transferTxParams || quote.transactionRequest;
      if (!txParams) {
        throw new Error('No transaction parameters found');
      }

      toast.info('Sending payment...', {
        duration: 10000,
        id: 'transaction-toast'
      });
      
      console.log('Sending main transaction...');
      const transferHash = await walletClient.sendTransaction({
        account: txParams.from,
        to: txParams.to,
        data: txParams.data,
        value: txParams.value ? BigInt(txParams.value) : BigInt(0),
        gas: 'gasLimit' in txParams ? BigInt(txParams.gasLimit) : txParams.gas ? BigInt(txParams.gas) : undefined,
        gasPrice: 'gasPrice' in txParams ? BigInt(txParams.gasPrice) : undefined,
        nonce: 'nonce' in txParams ? Number(txParams.nonce) : undefined,
      });

      console.log('Payment transaction sent:', transferHash);
      
      // Wait for the main transaction to be confirmed
      const receipt = await publicClient?.waitForTransactionReceipt({ hash: transferHash });
      console.log('Payment transaction confirmed:', receipt);
      
      toast.success('Payment confirmed!', {
        id: 'transaction-toast'
      });

      return { 
        success: true, 
        transferHash 
      };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(`Transaction failed: ${error.message || 'Unknown error'}`, {
        id: 'transaction-toast'
      });
      return { success: false, error: error.message };
    }
  };

  const onSubmit = async (data: SettleFormValues) => {
    const { token, chain } = data.settlementDetails;
    const usdAmount = data.amount;

    try {
      if (!isConnected) {
        setShowWalletRequired(true);
        return;
      }

      // Clear any existing quote
      setCurrentQuote(null);
      setIsLoadingQuote(true);
      
      // Ensure we have a valid token address
      if (!token.address || !token.address.startsWith('0x')) {
        throw new Error('Invalid token address');
      }
      
      // Ensure wallet address is properly formatted
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        throw new Error('Invalid wallet address');
      }
      
      // Ensure we have a valid API key
      if (!data.selectedFriend.bindPayApiKey) {
        throw new Error('Missing API key for recipient');
      }
      
      console.log('Submitting payment with:', {
        fromChain: chain.id,
        fromToken: token.address,
        fromAddress: walletAddress,
        usdAmount: usdAmount,
        recipientApiKey: `${data.selectedFriend.bindPayApiKey.substring(0, 4)}...`,
      });
      
      // Use the merchant's API key from the form data
      const quoteResponse = await fetchQuote({
        fromChain: chain.id as ChainId,
        fromToken: token.address as `0x${string}`,
        fromAddress: walletAddress as `0x${string}`,
        usdAmount: usdAmount,
        recipientApiKey: data.selectedFriend.bindPayApiKey as string,
      });

      if (!quoteResponse) {
        throw new Error('Failed to get quote');
      }

      // Store the quote to display the confirmation section
      setCurrentQuote(quoteResponse);
      setIsLoadingQuote(false);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setIsLoadingQuote(false);
      setCurrentQuote(null);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  // Helper function to format currency values with safety checks
  const formatCurrency = (value: number | string | undefined, symbol = '') => {
    if (value === undefined || value === null) return `${symbol}0`;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return `${symbol}0`;
    
    // Format based on size of number
    if (Math.abs(numValue) < 0.000001) {
      return `${symbol}${numValue.toExponential(6)}`;
    } else if (Math.abs(numValue) < 0.001) {
      return `${symbol}${numValue.toFixed(6)}`;
    } else if (Math.abs(numValue) < 1) {
      return `${symbol}${numValue.toFixed(4)}`;
    } else if (Math.abs(numValue) < 1000) {
      return `${symbol}${numValue.toFixed(2)}`;
    } else {
      return `${symbol}${numValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  // Helper to safely get token amount with decimals
  const getTokenAmount = (amount: string | undefined, decimals: number | undefined) => {
    if (!amount || decimals === undefined) return 0;
    try {
      return parseFloat(amount) / Math.pow(10, decimals);
    } catch (e) {
      console.error("Error calculating token amount:", e);
      return 0;
    }
  };

  // Helper function to get explorer URL
  const getExplorerUrl = (txId: string, chainId?: ChainId) => {
    if (!txId || !chainId) return undefined;
    
    const chain = chains[chainId];
    if (!chain || !chain.blockExplorerUrl) return undefined;
    
    return `${chain.blockExplorerUrl}/tx/${txId}`;
  };

  // Update the handleConfirmedTransaction function to properly get the amount
  const handleConfirmedTransaction = async () => {
    setIsProcessingTransaction(true);
    
    try {
      const result = await handleTransaction(currentQuote);

      if (!result.success || !result.transferHash) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Get the actual amount from the form or quote
      const { token, chain } = form.getValues('settlementDetails');
      const selectedFriend = form.getValues('selectedFriend');
      const usdAmount = form.getValues('amount'); // This is the user-entered amount
      
      // Use the actual amount entered by the user rather than trying to parse it from the quote
      setTransactionDetails({
        transactionId: result.transferHash,
        fromAmount: usdAmount, // Use the actual amount entered by the user
        fromSymbol: token.symbol,
        explorerUrl: getExplorerUrl(result.transferHash, chain.id),
        recipientName: selectedFriend?.name || '',
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  const formErrorMessages = [
    errors.amount?.message,
    errors.settlementDetails?.message,
    errors.selectedFriend?.message,
  ].filter(Boolean); // Filter out undefined/null messages

  useEffect(() => {
    async function loadBalances() {
      try {
        const fetchedBalances = await fetchWalletBalances(walletAddress);
        setBalances(fetchedBalances);
      } catch (error) {
        console.error('Failed to fetch balances:', error);
        toast.error('Failed to load token balances');
      } finally {
        setIsLoadingBalances(false);
      }
    }

    if (walletAddress) {
      loadBalances();
    }
  }, [walletAddress]);

  useEffect(() => {
    // Mark initial render as complete
    setIsInitialRender(false);
  }, []);
  
  useEffect(() => {
    // Skip the effect on initial render
    if (isInitialRender) return;
    
    // Only show modal if there's a manual wallet address AND no wallet is connected
    if (walletAddress && !isConnected && !walletClient) {
      setShowWalletRequired(true);
    } else {
      setShowWalletRequired(false);
    }
  }, [walletAddress, isConnected, walletClient, isInitialRender]);

  const { isChainSwitching } = useAutoChainSwitch({
    selectedChainId,
    isConnected,
  });

  const getButtonText = () => {
    if (isLoadingQuote) return 'Getting quote...';
    if (isProcessingTransaction) return 'Processing transaction...';
    if (isChainSwitching) return 'Switching network...';
    return 'Send now';
  };

  const isButtonDisabled = isLoadingQuote || isProcessingTransaction || !isConnected || isChainSwitching;

  const isLoading = isLoadingQuote || isProcessingTransaction || isChainSwitching;

  // Update the useEffect to properly set the settlement details
  useEffect(() => {
    if (merchantData) {
      try {
        // Set the selected friend
        setValue('selectedFriend', {
          id: merchantData.id,
          name: merchantData.name,
          email: null,
          walletAddress: merchantData.walletAddress,
          bindPayApiKey: merchantData.bindPayApiKey || process.env.NEXT_PUBLIC_BINDPAY_API_KEY || '',
          settlementDetails: merchantData.settlementDetails || null
        });
        
        // If merchant has settlement preferences, pre-select them
        if (merchantData.settlementDetails) {
          // Wrap this in a setTimeout to defer the state update
          setTimeout(() => {
            const chainId = parseInt(merchantData.settlementDetails.network);
            
            console.log('Looking for token in chain:', chainId);
            console.log('Available chains:', Object.keys(chains));
            console.log('Available tokens for chain:', tokens[chainId as ChainId] ? 'yes' : 'no');
            
            // Check if we have tokens for this chain
            if (!tokens[chainId as ChainId]) {
              console.warn(`No tokens found for chain ID ${chainId}`);
              return;
            }
            
            // Find the token in the tokens array
            const token = tokens[chainId as ChainId].find(t => 
              t.address.toLowerCase() === merchantData.settlementDetails?.token.toLowerCase()
            );
            
            console.log('Found token:', token ? token.symbol : 'none');
            
            if (chainId && token) {
              const chain = chains[chainId as ChainId];
              
              if (chain) {
                console.log('Setting settlement details with:', {
                  token: token.symbol,
                  chain: chain.name
                });
                
                setValue('settlementDetails', {
                  token: {
                    symbol: token.symbol,
                    name: token.name,
                    address: token.address,
                    decimals: token.decimals,
                    logoUrl: token.logoUrl ?? '/tokens/default.svg',
                  },
                  chain: {
                    id: chain.id,
                    name: chain.name,
                    nativeCurrency: chain.nativeCurrency,
                    logoUrl: chain.logoUrl ?? '/chains/default.svg',
                    rpcUrl: chain.rpcUrl,
                  },
                });
              }
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error setting merchant data in form:', error);
      }
    }
  }, [merchantData, setValue]);

  return (
    <>
      <Form {...form}>
        <div className="w-full max-w-[600px] flex flex-col mx-auto md:flex-row items-start gap-4 py-4">
          {/* Left side - Form */}
          <div className="flex-1 w-full flex flex-col gap-4">
            {/* Add a connection status indicator at the top of the form */}
            {!isConnected && (
              <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Please connect your wallet to complete the transaction
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 w-full flex flex-col gap-4 p-4 rounded-lg">
              {/* Amount Input */}
              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium">$</div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={field.value ? field.value.toFixed(2) : '0.00'}
                          onChange={(e) => {
                            const input = e.target.value.replace(/[^\d]/g, '');
                            const numericValue = parseInt(input, 10);
                            field.onChange(!input ? 0 : numericValue / 100);
                          }}
                          className="h-16 pl-8 mx-2 text-4xl font-medium rounded-xl bg-background border-border"
                          style={{ fontSize: '28px' }}
                          disabled={isSettlingRequest || !!currentQuote}
                          onFocus={(e) => !isSettlingRequest && e.target.select()}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method Selection */}
              <FormField
                control={control}
                name="settlementDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-[60px] justify-between rounded-xl bg-background border-border"
                        onClick={handleTokenSelectorClick}
                        disabled={!watch('selectedFriend') || !!currentQuote}
                      >
                        <div className="flex items-center gap-2">
                          <TokenNetworkDisplay
                            tokenAddress={field.value?.token?.address}
                            chainId={field.value?.chain?.id}
                            size="md"
                          />
                          <span className="text-lg">{field.value?.token?.symbol || 'Select payment method'}</span>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show Get Quote button when no quote is present */}
              {!currentQuote && (
                <div className="relative w-full">
                  <ProgressButton
                    type="submit"
                    className="h-14 text-lg font-medium bg-secondary text-foreground disabled:opacity-50"
                    isLoading={isLoadingQuote}
                    loadingText="Getting quote..."
                    disabled={isLoadingQuote || !isConnected || !watch('settlementDetails')}
                  >
                    Pay
                  </ProgressButton>
                </div>
              )}
            </form>

            {/* Show payment confirmation when quote is available */}
            {currentQuote && (
              <PaymentConfirmation
                quote={currentQuote}
                recipientName={form.getValues('selectedFriend')?.name || ''}
                isProcessing={isProcessingTransaction}
                onConfirm={handleConfirmedTransaction}
                onCancel={() => {
                  setCurrentQuote(null);
                  setIsProcessingTransaction(false);
                }}
              />
            )}
          </div>
        </div>
      </Form>

      <Dialog open={showFeeSaveDialog} onOpenChange={setShowFeeSaveDialog}>
        <DialogContent className="sm:max-w-md bg-[#161616] border-none">
          <DialogTitle className="sr-only">Fee Save Options</DialogTitle>
          <FeeSaveDialog
            recipient={selectedFriend}
            onClose={() => {
              setShowFeeSaveDialog(false);
              setShowTokenSelector(true);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTokenSelector} onOpenChange={setShowTokenSelector}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="sr-only">Select Token</DialogTitle>
          <TokenList
            walletAddress={walletAddress}
            onSelect={handleTokenSelect}
            onClose={() => setShowTokenSelector(false)}
            initialBalances={balances}
          />
        </DialogContent>
      </Dialog>

      {showSuccessModal && (
        <PaymentSuccess
          transactionId={transactionDetails?.transactionId || ''}
          fromAmount={transactionDetails?.fromAmount || ''}
          fromSymbol={transactionDetails?.fromSymbol || ''}
          toAmount={transactionDetails?.toAmount || ''}
          toSymbol={transactionDetails?.toSymbol || ''}
          recipientName={transactionDetails?.recipientName || ''}
          explorerUrl={transactionDetails?.explorerUrl}
          onClose={() => {
            setShowSuccessModal(false);
            setTransactionDetails(null);
          }}
        />
      )}
    </>
  );
}