// commerce/app/checkout/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TokenList } from '@/components/token-list';
import { PaymentConfirmation } from '@/components/payment-confirmation';
import { PaymentSuccess } from '@/components/payment-success';
import { QuoteResponse, usebindpayQuote } from '@/hooks/usebindpay-quote';
import { useAccount, useWalletClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { ChainId } from '@/constants/ChainToken';
import { useAutoChainSwitch } from '@/hooks/use-chain-switch';

// Create a component that uses useSearchParams
function CheckoutContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useAutoChainSwitch();
  
  // Get parameters from URL
  const amount = searchParams.get('amount');
  const merchantId = searchParams.get('merchantId');
  const merchantName = searchParams.get('merchantName');
  const sessionId = searchParams.get('sessionId');
  const preferredToken = searchParams.get('token');
  const preferredNetwork = searchParams.get('network');
  
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { fetchQuote, loading: quoteLoading } = usebindpayQuote();

  // Validate required parameters
  useEffect(() => {
    if (!amount || !merchantId || !sessionId) {
      toast.error("Invalid payment link. Missing required parameters.");
    }
  }, [amount, merchantId, sessionId]);

  // Handle token selection
  const handleTokenSelect = async (token: any) => {
    setSelectedToken(token);
    setShowTokenList(false);
    
    if (!address || !merchantId || !amount) {
      toast.error("Missing information. Cannot proceed with payment.");
      return;
    }
    
    try {
      // Fetch quote using the merchant-provided amount
      const quoteResult = await fetchQuote({
        fromChain: token.chain.id as ChainId,
        fromToken: token.address as `0x${string}`,
        fromAddress: address as `0x${string}`,
        usdAmount: parseFloat(amount),
        recipientApiKey: merchantId // Using merchantId as the API key
      });
      
      if (quoteResult) {
        setQuote(quoteResult);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error("Failed to get payment quote. Please try again.");
    }
  };

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!quote || !walletClient) {
      toast.error("Cannot process payment. Missing quote or wallet.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Switch chain if needed
      if (selectedToken && selectedToken.chain.id !== quote.fromChain) {
        await switchChain(quote.fromChain as ChainId);
      }
      
      // In a real implementation, you would execute the transaction here
      // For demo purposes, we'll simulate a successful transaction
      setTimeout(() => {
        const mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setTxHash(mockTxHash);
        setIsComplete(true);
        
        // Update session status in localStorage
        if (sessionId) {
          const sessionKey = `payment_${sessionId}`;
          const sessionData = localStorage.getItem(sessionKey);
          if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            localStorage.setItem(sessionKey, JSON.stringify({
              ...parsedData,
              status: 'completed',
              txHash: mockTxHash
            }));
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment cancellation
  const handleCancelPayment = () => {
    setQuote(null);
    setSelectedToken(null);
  };

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h1 className="text-2xl font-bold mb-2">Complete Payment</h1>
        <p className="text-muted-foreground mb-6">
          {merchantName ? `Pay ${merchantName}` : 'Complete your payment'}
        </p>
        
        {isComplete && txHash ? (
          <PaymentSuccess 
            transactionId={txHash}
            fromAmount={amount || '0'}
            fromSymbol="USD"
            toAmount={amount || '0'}
            toSymbol="USD"
            recipientName={merchantName || 'Merchant'}
            onClose={() => {
              // Redirect to a thank you page or close the window
              window.close();
            }}
          />
        ) : (
          <>
            <div className="mb-6">
              <p className="text-lg font-medium">Amount</p>
              <p className="text-3xl font-bold">${amount ? parseFloat(amount).toFixed(2) : '0.00'}</p>
            </div>
            
            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Connect your wallet to complete this payment</p>
                <appkit-connect-button label="Connect Wallet"/>
              </div>
            ) : (
              <>
                {!selectedToken && !quote && (
                  <Button 
                    onClick={() => setShowTokenList(true)} 
                    className="w-full"
                  >
                    Select Payment Method
                  </Button>
                )}
                
                {selectedToken && quote && (
                  <PaymentConfirmation
                    quote={quote}
                    recipientName={merchantName || 'Merchant'}
                    isProcessing={isProcessing}
                    onConfirm={handleConfirmPayment}
                    onCancel={handleCancelPayment}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      
      {showTokenList && address && (
        <TokenList
          walletAddress={address}
          onSelect={handleTokenSelect}
          onClose={() => setShowTokenList(false)}
          initialBalances={{}}
        />
      )}
    </div>
  );
}

// Loading fallback component
function CheckoutLoading() {
  return (
    <div className="container max-w-md mx-auto py-8 px-4 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading payment details...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}