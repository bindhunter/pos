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
import { QRCodeSVG } from 'qrcode.react';
import { getNetworkName, getTokenSymbol } from '@/lib/token-chain-parser';

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
    }
  };
  merchantInitiated?: boolean;
  presetAmount?: number;
  sessionId?: string | null;
}

export function SettleForm({ 
  walletAddress, 
  userId, 
  merchantData,
  merchantInitiated = false,
  presetAmount,
  sessionId
}: SettleFormProps) {
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
  const [merchantAmount, setMerchantAmount] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

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

      // Add sessionId to transaction metadata if available
      const metadata = sessionId ? { sessionId } : undefined;

      return { 
        success: true, 
        transferHash,
        metadata
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

  // Use presetAmount if provided
  useEffect(() => {
    if (presetAmount && presetAmount > 0) {
      setValue('amount', presetAmount);
    }
  }, [presetAmount, setValue]);

  // Add a function to generate payment URL for merchant-initiated flow
  const generatePaymentUrl = () => {
    if (!merchantAmount || parseFloat(merchantAmount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsGeneratingPayment(true);

    try {
      // Create a unique session ID for this payment
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Base URL for your payment page
      const baseUrl = window.location.origin;
      
      // Create URL with parameters
      const url = new URL(`${baseUrl}/checkout`);
      url.searchParams.append('amount', merchantAmount);
      url.searchParams.append('merchantId', merchantData?.id || '');
      url.searchParams.append('merchantName', merchantData?.name || '');
      url.searchParams.append('sessionId', sessionId);
      
      // Add settlement details if available
      if (merchantData?.settlementDetails) {
        url.searchParams.append('token', merchantData.settlementDetails.token);
        url.searchParams.append('network', merchantData.settlementDetails.network);
      }
      
      // Set the payment URL for QR code generation
      setPaymentUrl(url.toString());
      setIsGeneratingPayment(false);
      
      // Store session data in localStorage for status tracking
      localStorage.setItem(`payment_${sessionId}`, JSON.stringify({
        amount: merchantAmount,
        merchantId: merchantData?.id,
        merchantName: merchantData?.name,
        timestamp: Date.now(),
        status: 'pending'
      }));
    } catch (error) {
      console.error('Error generating payment URL:', error);
      toast.error("Failed to generate payment URL");
      setIsGeneratingPayment(false);
    }
  };
  
  // Function to reset payment state
  const resetPayment = () => {
    setPaymentUrl(null);
    setMerchantAmount('');
  };

  // Add this function to handle the confirmation
  const handleConfirmPayment = async () => {
    if (!currentQuote) return;
    
    setIsProcessingTransaction(true);
    try {
      // Your payment processing logic here
      // ...
      
      // After successful payment:
      setTransactionDetails({
        transactionId: "tx_id_here", // Replace with actual tx ID
        fromAmount: currentQuote.fromAmount,
        fromSymbol: currentQuote.fromToken.symbol,
        toAmount: currentQuote.toAmount,
        toSymbol: currentQuote.toToken.symbol,
        recipientName: selectedFriend.name || merchantData?.name || "Recipient",
        explorerUrl: "https://explorer.url/tx/..." // Replace with actual explorer URL
      });
      
      setShowSuccessModal(true);
      setCurrentQuote(null);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  // Add this function to handle cancellation
  const handleCancelPayment = () => {
    setCurrentQuote(null);
  };

  return (
    <>
      <Form {...form}>
        <div className="space-y-4">
          {/* Only show the amount input field if NOT merchant initiated */}
          {!merchantInitiated ? (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            // Hidden field to store the preset amount
            <input type="hidden" name="amount" value={presetAmount} />
          )}

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <div 
              className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-secondary/10"
              onClick={() => setShowTokenSelector(true)}
            >
              {watch('settlementDetails')?.token ? (
                <div className="flex items-center gap-2">
                  <img 
                    src={watch('settlementDetails')?.token?.logoUrl || '/tokens/default.svg'} 
                    alt={watch('settlementDetails')?.token?.symbol} 
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{watch('settlementDetails')?.token?.symbol}</span>
                  <span className="text-muted-foreground">on</span>
                  <img 
                    src={watch('settlementDetails')?.chain?.logoUrl || '/chains/default.svg'} 
                    alt={watch('settlementDetails')?.chain?.name} 
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{watch('settlementDetails')?.chain?.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Select token</span>
              )}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Show Get Quote button when no quote is present */}
          {!currentQuote && (
            <div className="relative w-full">
              <ProgressButton
                onClick={form.handleSubmit(onSubmit)}
                disabled={!watch('settlementDetails')?.token || isLoadingQuote || isProcessingTransaction}
                isLoading={isLoadingQuote || isProcessingTransaction}
                className="w-full"
              >
                {isLoadingQuote ? 'Getting Quote...' : 
                 isProcessingTransaction ? 'Processing...' : 'Generate Payment'}
              </ProgressButton>
            </div>
          )}
        </div>
      </Form>

      {/* Add this to render the PaymentConfirmation when a quote exists */}
      {currentQuote && (
        <PaymentConfirmation
          quote={currentQuote}
          recipientName={selectedFriend?.name || merchantData?.name || "Recipient"}
          isProcessing={isProcessingTransaction}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
        />
      )}

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