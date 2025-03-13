'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressButton } from '@/components/ui/progress-button';
import { Info, ArrowDown } from 'lucide-react';
import { QuoteResponse } from '@/hooks/usebindpay-quote';
import { motion } from 'framer-motion'; 

interface PaymentConfirmationProps {
  quote: QuoteResponse | any; // Make more flexible for different response structures
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
  
  // Helper to calculate total with fees
  const calculateTotal = (quote: QuoteResponse) => {
    if (!quote || !quote.fees || !quote.fromToken || quote.fromToken.decimals === undefined) return 0;
    
    try {
      const fromAmount = getTokenAmount(quote.fromAmount, quote.fromToken.decimals);
      
      // Handle different fee structures
      let totalFees = 0;
      
      if (quote.fees.bridge) {
        totalFees += typeof quote.fees.bridge === 'number' ? quote.fees.bridge : 0;
      }
      
      if (quote.fees.gas) {
        // Handle gas as array or string
        if (Array.isArray(quote.fees.gas)) {
          // Sum up gas fees if it's an array
          totalFees += quote.fees.gas.reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0);
        } else {
          totalFees += parseFloat(quote.fees.gas) || 0;
        }
      }
      
      if (quote.fees.integrator) {
        totalFees += parseFloat(quote.fees.integrator.toString()) || 0;
      }
      
      return fromAmount + totalFees;
    } catch (e) {
      console.error("Error calculating total:", e);
      return 0;
    }
  };

  // Helper function specifically for fee display
  const formatFee = (value: number | string | undefined, symbol = '') => {
    if (value === undefined || value === null) return `${symbol}0`;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return `${symbol}0`;
    
    // For zero values, just show 0
    if (numValue === 0) return `0 ${symbol}`;
    
    // For very small values (like gas fees)
    if (Math.abs(numValue) < 0.000001) {
      return `${numValue.toFixed(8)} ${symbol}`;
    }
    
    // For normal values
    return `${numValue.toFixed(4)} ${symbol}`;
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
  const fromSymbol = actualQuote.fromToken?.symbol || 'Token';
  const toSymbol = actualQuote.toToken?.symbol || 'Token';
  
  // Calculate USD values if available
  const fromTokenPrice = actualQuote.fromToken?.price || 0;
  const toTokenPrice = actualQuote.toToken?.price || 0;
  
  const fromAmountValue = getTokenAmount(actualQuote.fromAmount, actualQuote.fromToken?.decimals);
  const toAmountValue = getTokenAmount(actualQuote.toAmount, actualQuote.toToken?.decimals);
  
  const fromAmountUsd = fromAmountValue * fromTokenPrice;
  const toAmountUsd = toAmountValue * toTokenPrice;

  return (
    <motion.div 
      className="space-y-4 mt-4 border border-border rounded-xl p-4 bg-background"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Payment Details</h3>
        <span className="text-sm text-muted-foreground">
          via {actualQuote.provider} {actualQuote.subProvider ? `(${actualQuote.subProvider})` : ''}
        </span>
      </div>
      
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
      
      {/* Fee breakdown - updated styling */}
      <div className="rounded-lg bg-secondary/30 border border-border">
        <div className="p-4">
          <div className="flex items-center gap-1">
            <Info size={16} className="text-muted-foreground" />
            <h3 className="font-medium">Fee Breakdown</h3>
          </div>
          
          {actualQuote.fees && (
            <div className="text-sm">
              {actualQuote.fees.gas && (
                <div className="flex justify-between items-center">
                </div>
              )}
              
              {actualQuote.fees.bridge && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bridge fee</span>
                  <span>{formatFee(actualQuote.fees.bridge, fromSymbol)}</span>
                </div>
              )}
              
              {actualQuote.fees.integrator !== undefined && (
                <div className="flex justify-between items-center">
                  <span className={parseFloat(actualQuote.fees.integrator.toString()) < 0 ? "text-green-500" : ""}>
                  </span>
                </div>
              )}
            </div>
          )}
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