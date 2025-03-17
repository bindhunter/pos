'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressButton } from '@/components/ui/progress-button';
import { Info, ArrowDown } from 'lucide-react';
import { QuoteResponse } from '@/hooks/usebindpay-quote';
import { motion } from 'framer-motion'; 

interface PaymentConfirmationProps {
  quote: QuoteResponse | any;
  recipientName: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PaymentConfirmation({
  quote,
  recipientName,
  isProcessing,
  onConfirm,
  onCancel,
}: PaymentConfirmationProps) {
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
  
  // Handle nested quote structure if needed
  const actualQuote = quote.quote || quote;
  
  // Safety check for required quote properties
  if (!actualQuote || !actualQuote.fromToken || !actualQuote.toToken) {
    console.error("Invalid quote data:", actualQuote);
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-lg">
        Invalid quote data. Please try again.
      </div>
    );
  }

  // Safely access token symbols
  const fromSymbol = actualQuote.fromToken?.symbol || 'Unknown';
  const toSymbol = actualQuote.toToken?.symbol || 'Unknown';
  
  // Safely calculate token amounts
  const fromAmountValue = getTokenAmount(
    actualQuote.fromAmount,
    actualQuote.fromToken?.decimals
  );
  
  const toAmountValue = getTokenAmount(
    actualQuote.toAmount,
    actualQuote.toToken?.decimals
  );
  
  // Safely get token prices
  const fromTokenPrice = actualQuote.fromToken?.price || 0;
  const toTokenPrice = actualQuote.toToken?.price || 0;
  
  // Calculate USD values
  const fromAmountUsd = fromAmountValue * fromTokenPrice;
  const toAmountUsd = toAmountValue * toTokenPrice;
  
  // Helper function for fee display
  const formatFee = (value: number | string | undefined, symbol = '') => {
    if (value === undefined || value === null) return `0 ${symbol}`;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return `0 ${symbol}`;
    
    // For zero values, just show 0
    if (numValue === 0) return `0 ${symbol}`;
    
    // For very small values (like gas fees)
    if (Math.abs(numValue) < 0.000001) {
      return `${numValue.toExponential(6)} ${symbol}`;
    } else if (Math.abs(numValue) < 0.001) {
      return `${numValue.toFixed(6)} ${symbol}`;
    } else if (Math.abs(numValue) < 1) {
      return `${numValue.toFixed(4)} ${symbol}`;
    } else {
      return `${numValue.toFixed(4)} ${symbol}`;
    }
  };

  return (
    <motion.div 
      className="space-y-4 p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      
      {/* Payment summary */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">You're sending</span>
          <div className="text-right">
            <div className="font-medium">
              {formatCurrency(fromAmountValue)} {fromSymbol}
            </div>
            {fromTokenPrice > 0 && (
              <div className="text-xs text-muted-foreground">
                ≈ ${formatCurrency(fromAmountUsd)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center">
          <ArrowDown size={20} className="text-muted-foreground" />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Recipient gets</span>
          <div className="text-right">
            <div className="font-medium">
              {formatCurrency(toAmountValue)} {toSymbol}
            </div>
            {toTokenPrice > 0 && (
              <div className="text-xs text-muted-foreground">
                ≈ ${formatCurrency(toAmountUsd)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Recipient</span>
          <span className="font-medium truncate max-w-[200px]">
            {recipientName || 'Unknown'}
          </span>
        </div>
      </div>
      
      
      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <ProgressButton
          className="flex-1 bg-primary text-black"
          onClick={onConfirm}
          isLoading={isProcessing}
          loadingText="Processing..."
          disabled={isProcessing}
        >
          Confirm
        </ProgressButton>
      </div>
    </motion.div>
  );
}