'use client';

import { useState } from 'react';
import { SettleForm } from "@/components/settle-form"
import { CreateMerchant } from "@/components/subpayee/CreateMerchant"
import { useAccount, useConnect } from 'wagmi';
import { Button } from "@/components/ui/button";
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
  const { connect, connectors } = useConnect();

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
  };

  const networkName = merchantData?.settlementDetails?.network ? 
    getNetworkName(merchantData.settlementDetails.network as unknown as ChainId) : '';
  
  const tokenSymbol = merchantData?.settlementDetails?.token ? 
    getTokenSymbol(merchantData.settlementDetails.token as any, merchantData.settlementDetails.network as unknown as ChainId) : '';

  const handleConnect = () => {
    // Find the first available connector (usually MetaMask)
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    } else {
      toast.error('No wallet connectors available');
    }
  };

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
                <Button onClick={handleConnect} className="w-full">
                  Connect Wallet to Test
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="col-span-1">
          {merchantData ? (
            <div className="bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-bold mb-4">Test Checkout</h2>
              {isConnected ? (
                <SettleForm 
                  walletAddress={address || ""} 
                  userId="test-user"
                  merchantData={merchantData}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Connect your wallet to test the checkout</p>
                  <Button onClick={handleConnect}>Connect Wallet</Button>
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

