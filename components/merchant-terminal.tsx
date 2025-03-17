'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MerchantTerminalProps {
  merchantId: string;
  merchantName: string;
  settlementDetails: any;
  onPaymentGenerated: (url: string, amount: string) => void;
}

export function MerchantTerminal({ 
  merchantId, 
  merchantName, 
  settlementDetails,
  onPaymentGenerated 
}: MerchantTerminalProps) {
  const [amount, setAmount] = useState<string>('');
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

  const generatePaymentUrl = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsGeneratingPayment(true);

    try {
      // Generate a unique session ID for this payment
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the full URL with your domain
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Create URL with parameters using URL constructor for proper encoding
      const url = new URL(`${baseUrl}/checkout`);
      url.searchParams.append('merchantId', merchantId);
      url.searchParams.append('amount', amount);
      url.searchParams.append('session', sessionId);
      url.searchParams.append('merchantName', merchantName);
      
      // Add settlement details if available
      if (settlementDetails?.token && settlementDetails?.network) {
        url.searchParams.append('token', settlementDetails.token);
        url.searchParams.append('network', settlementDetails.network);
      }
      
      // Get the properly formatted URL string
      const paymentUrl = url.toString();
      
      // Call the callback with the generated URL and amount
      onPaymentGenerated(paymentUrl, amount);
      
      toast.success("Payment link generated successfully");
      
      // Log the URL for debugging
      console.log("Generated payment URL:", paymentUrl);
    } catch (error) {
      console.error('Error generating payment URL:', error);
      toast.error("Failed to generate payment link");
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Terminal</CardTitle>
        <CardDescription>Enter amount to charge customer</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount ($)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="text-xl h-12"
            />
          </div>
          
          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-sm text-muted-foreground">
              Customer will be prompted to pay {amount ? `$${parseFloat(amount).toFixed(2)} ` : '$0.00 '} 
              using their preferred token.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={generatePaymentUrl}
          disabled={isGeneratingPayment || !amount || parseFloat(amount) <= 0}
        >
          {isGeneratingPayment ? "Generating..." : "Proceed to Payment"}
        </Button>
      </CardFooter>
    </Card>
  );
}