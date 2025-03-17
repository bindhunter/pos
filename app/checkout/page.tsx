// commerce/app/checkout/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettleForm } from '@/components/settle-form';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

// Create a component that uses useSearchParams
function CheckoutContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  
  // Get parameters from URL
  const amount = searchParams.get('amount');
  const merchantId = searchParams.get('merchantId');
  const merchantName = searchParams.get('merchantName');
  const sessionId = searchParams.get('session');
  const preferredToken = searchParams.get('token');
  const preferredNetwork = searchParams.get('network');
  
  // Check for required parameters
  if (!amount || !merchantId || !sessionId) {
    toast.error("Invalid payment link. Missing required parameters.");
  }
  
  // Create merchant data object from URL parameters
  const merchantData = {
    id: merchantId || '',
    name: merchantName || 'Merchant',
    walletAddress: '', // This will be filled by the SettleForm component
    settlementDetails: preferredToken && preferredNetwork ? {
      token: preferredToken,
      network: preferredNetwork
    } : undefined
  };

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h1 className="text-2xl font-bold mb-2">Complete Payment</h1>
        <p className="text-muted-foreground mb-6">
          {merchantName ? `Pay ${merchantName}` : 'Complete your payment'}
          {amount && ` - $${amount}`}
        </p>
        
        {!isConnected ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Connect your wallet to complete this payment</p>
            <appkit-connect-button label="Connect Wallet"/>
          </div>
        ) : (
          <SettleForm
            walletAddress={address || ''}
            userId={sessionId}
            merchantData={merchantData}
            merchantInitiated={true}
            presetAmount={amount ? parseFloat(amount) : undefined}
            sessionId={sessionId}
          />
        )}
      </div>
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