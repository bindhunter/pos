'use client';

import { useState, useEffect } from 'react';
import { SettleForm } from "@/components/settle-form"
import { CreateMerchant } from "@/components/subpayee/CreateMerchant"
import { useAccount } from 'wagmi';
import { toast } from "sonner";
import { getNetworkName, getTokenSymbol } from '@/lib/token-chain-parser';
import { ChainId } from '@/constants/ChainToken';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MerchantTerminal } from "@/components/merchant-terminal"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from 'qrcode.react';

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

  // Add state for payment mode
  const [paymentMode, setPaymentMode] = useState<'user' | 'merchant'>('user');
  const [paymentStep, setPaymentStep] = useState<'merchant' | 'user'>('merchant');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Function to handle merchant amount submission
  const handleMerchantAmountSubmit = (url: string, amount: string) => {
    setPaymentUrl(url);
    setPaymentAmount(amount);
    setPaymentStep('customer');
    setSessionId(`session-${Date.now()}`);
  };

  // Function to reset payment flow
  const resetPaymentFlow = () => {
    setPaymentStep('merchant');
    setPaymentAmount('');
    setPaymentUrl(null);
    setSessionId(null);
  };

  // Inside your Dashboard component, add this function for NFC writing
  const writeToNFC = async () => {
    if (!paymentUrl) {
      toast.error("No payment URL generated");
      return;
    }

    if (!('NDEFReader' in window)) {
      toast.error("NFC writing is not supported in this browser. Try using Chrome on Android.");
      return;
    }

    try {
      toast.info("Tap your NFC tag to write the payment URL");
      
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [{ recordType: "url", data: paymentUrl }]
      });
      
      toast.success("Successfully wrote payment URL to NFC tag");
    } catch (error) {
      console.error("Error writing to NFC tag:", error);
      toast.error("Failed to write to NFC tag: " + (error as Error).message);
    }
  };

  // Add this component inside your dashboard page
  const DebugPanel = () => {
    return (
      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Debug Information</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <p>Payment URL: {paymentUrl || 'Not generated'}</p>
          <p>Payment Amount: {paymentAmount || 'Not set'}</p>
          <p>Session ID: {sessionId || 'Not set'}</p>
          <p>Payment Step: {paymentStep}</p>
          <p>NFC Support: {('NDEFReader' in window) ? 'Available' : 'Not available'}</p>
        </div>
        <div className="mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log({
                paymentUrl,
                paymentAmount,
                sessionId,
                paymentStep,
                merchantData
              });
              toast.info("Debug info logged to console");
            }}
          >
            Log Debug Info
          </Button>
        </div>
      </div>
    );
  };

  // Add this component to your dashboard
  const NfcInstructions = () => {
    return (
      <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
        <h3 className="font-medium mb-2">How to Write to NFC Tag</h3>
        <ol className="text-sm space-y-2 list-decimal pl-4">
          <li>Install an NFC writer app (like NFC Tools) on your Android phone</li>
          <li>Copy the payment URL by clicking on the text field above</li>
          <li>Open the NFC writer app and select "Write" > "URL/URI"</li>
          <li>Paste the payment URL</li>
          <li>Tap your NFC tag to write the URL</li>
          <li>Test by tapping the tag with your phone - it should open the payment page</li>
        </ol>
      </div>
    );
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
                {isConnected && (
                  <div className="flex items-center">
                    <span className="text-sm text-green-500 mr-2">Wallet connected</span>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                )}
              </div>
              
              {isConnected ? (
                <div className="space-y-4">
                  {paymentStep === 'merchant' ? (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Step 1: Merchant Enters Amount</h3>
                      <MerchantTerminal 
                        merchantId={merchantData.id}
                        merchantName={merchantData.name}
                        settlementDetails={merchantData.settlementDetails}
                        onPaymentGenerated={handleMerchantAmountSubmit}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Step 2: Customer Payment</h3>
                        <Button variant="outline" size="sm" onClick={resetPaymentFlow}>
                          Back to Step 1
                        </Button>
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-lg mb-4">
                        <p className="text-sm">Amount to pay: <span className="font-bold">${parseFloat(paymentAmount).toFixed(2)}</span></p>
                      </div>
                      {paymentUrl && (
                        <div className="bg-white p-4 rounded-lg mb-4 flex flex-col items-center">
                          <h3 className="text-black font-medium mb-2">Scan with Mobile Wallet</h3>
                          <QRCodeSVG 
                            value={paymentUrl} 
                            size={200}
                            level="H"
                            includeMargin={true}
                          />
                          <p className="text-xs text-gray-500 mt-2">Or copy this URL:</p>
                          <input 
                            type="text" 
                            value={paymentUrl} 
                            readOnly 
                            className="w-full mt-2 p-2 text-xs bg-gray-100 border rounded text-black"
                            onClick={(e) => {
                              e.currentTarget.select();
                              navigator.clipboard.writeText(paymentUrl);
                              toast.success("URL copied to clipboard");
                            }}
                          />
                          <Button 
                            onClick={writeToNFC} 
                            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Write to NFC Tag
                          </Button>
                        </div>
                      )}
                      {paymentUrl && <NfcInstructions />}
                      <SettleForm 
                        walletAddress={address || ""} 
                        userId="test-user"
                        merchantData={merchantData}
                        merchantInitiated={true}
                        presetAmount={parseFloat(paymentAmount)}
                        sessionId={sessionId}
                      />
                    </div>
                  )}
                </div>
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
      {isConnected && <DebugPanel />}
    </main>
  )
}

