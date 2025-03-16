'use client';

import { useState, useEffect } from 'react';
import { SettleForm } from "@/components/settle-form"
import { CreateMerchant } from "@/components/subpayee/CreateMerchant"
import { useAccount } from 'wagmi';
import { toast } from "sonner";
import { getNetworkName, getTokenSymbol } from '@/lib/token-chain-parser';
import { ChainId } from '@/constants/ChainToken';

export default function Dashboard() {
  const [merchantData, setMerchantData] = useState<{
    id: string;
    name: string;
    walletAddress: string;
    bindPayApiKey?: string;
    settlementDetails?: {
      token: string;
      network: string;
    };
  } | null>(null);
  
  const { address, isConnected } = useAccount();
  
  // Listen for wallet connection events from Reown
  useEffect(() => {
    const handleWalletConnected = () => {
      toast.success('Wallet connected successfully');
    };
    
    // Add event listener for Reown's connection event
    document.addEventListener('appkit:connected', handleWalletConnected);
    
    return () => {
      document.removeEventListener('appkit:connected', handleWalletConnected);
    };
  }, []);

  // Add this useEffect to detect when wallet is connected via the address
  useEffect(() => {
    if (address && isConnected && merchantData) {
      // If wallet is connected and merchant data exists, show a success toast
      toast.success('Wallet connected successfully');
    }
  }, [address, isConnected, merchantData]);

  const handleMerchantCreated = (merchantData: any) => {
    console.log('Merchant created callback received:', merchantData);
    
    // Set the complete merchant data
    setMerchantData({
      id: merchantData.id || `merchant-${Date.now()}`,
      name: merchantData.name,
      walletAddress: merchantData.walletAddress,
      bindPayApiKey: merchantData.apiKey || process.env.NEXT_PUBLIC_BINDPAY_API_KEY,
      settlementDetails: merchantData.settlementDetails
    });
    
    toast.success('Merchant created successfully');
    
    // If merchant is created but wallet not connected, prompt user to connect
    if (!isConnected) {
      toast.info('Connect your wallet to test the checkout', {
        action: {
          label: 'Connect',
          onClick: () => {
            // Trigger Reown connect modal programmatically
            const connectButton = document.querySelector('appkit-connect-button');
            if (connectButton) {
              (connectButton as any).click();
            }
          }
        }
      });
    }
  };

  const networkName = merchantData?.settlementDetails?.network ? 
    getNetworkName(merchantData.settlementDetails.network as unknown as ChainId) : '';
  
  const tokenSymbol = merchantData?.settlementDetails?.token ? 
    getTokenSymbol(merchantData.settlementDetails.token as any, merchantData.settlementDetails.network as unknown as ChainId) : '';

  return (
    <main className="container py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1">
          {!merchantData ? (
            <CreateMerchant onSuccess={handleMerchantCreated} />
          ) : (
            <div className="bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-bold mb-4">Merchant Created</h2>
              <p className="mb-2"><span className="font-medium">ID:</span> {merchantData.id}</p>
              <p className="mb-2"><span className="font-medium">Name:</span> {merchantData.name}</p>
              <p className="mb-4"><span className="font-medium">Wallet:</span> {merchantData.walletAddress.substring(0, 6)}...{merchantData.walletAddress.substring(merchantData.walletAddress.length - 4)}</p>
              
              {merchantData.bindPayApiKey && (
                <p className="mb-2"><span className="font-medium">API Key:</span> {merchantData.bindPayApiKey.substring(0, 8)}...{merchantData.bindPayApiKey.substring(merchantData.bindPayApiKey.length - 4)}</p>
              )}
              
              {merchantData.settlementDetails && (
                <p className="mb-4">
                  <span className="font-medium">Settlement:</span> {tokenSymbol} on {networkName}
                </p>
              )}
              
              {!isConnected && (
                <div className="w-full mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Connect your wallet to test the checkout flow.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="col-span-1">
          {merchantData ? (
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Test Checkout</h2>
                {!isConnected && (
                  <div className="flex items-center">
                    {/* Empty div for layout consistency */}
                  </div>
                )}
                {isConnected && (
                  <div className="flex items-center">
                    <span className="text-sm text-green-500 mr-2">Wallet connected</span>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                )}
              </div>
              
              {isConnected ? (
                <SettleForm 
                  walletAddress={address || ""} 
                  userId="test-user"
                  merchantData={merchantData}
                />
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground mb-4">You need to connect your wallet to test the checkout</p>
                  <div className="flex justify-center">
                    <appkit-connect-button label="Connect Wallet"/>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card p-6 rounded-lg border border-border flex items-center justify-center">
              <p className="text-muted-foreground">Create a merchant first to test the checkout</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

