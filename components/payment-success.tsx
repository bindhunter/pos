'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PaymentSuccessProps {
  transactionId: string;
  fromAmount: string | number;
  fromSymbol: string;
  recipientName: string;
  explorerUrl?: string;
  onClose: () => void;
}

export function PaymentSuccess({
  transactionId,
  fromAmount,
  fromSymbol,
  recipientName,
  explorerUrl,
  onClose,
}: PaymentSuccessProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Transaction ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Format transaction ID for display
  const formatTxId = (txId: string) => {
    if (!txId || txId.length <= 16) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 8)}`;
  };
  
  // Format amount to handle scientific notation and ensure proper display
  const formatAmount = (amount: string | number) => {
    if (amount === undefined || amount === null) return '0';
    
    let numValue: number;
    
    if (typeof amount === 'string') {
      numValue = parseFloat(amount);
    } else {
      numValue = amount;
    }
    
    if (isNaN(numValue)) return '0';
    
    // Format based on size
    if (numValue === 0) return '0';
    if (numValue < 0.001) return numValue.toFixed(6);
    if (numValue < 1) return numValue.toFixed(4);
    if (numValue < 10000) return numValue.toFixed(2);
    return numValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-lg"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-6">
            You've successfully sent {formatAmount(fromAmount)} {fromSymbol} to {recipientName}
          </p>
          
          <div className="w-full bg-secondary/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-muted-foreground">Amount sent</span>
              <span className="font-medium">{formatAmount(fromAmount)} {fromSymbol}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transaction ID</span>
              <div className="flex items-center gap-1">
                <span className="font-medium text-xs">{formatTxId(transactionId)}</span>
                <button 
                  onClick={() => copyToClipboard(transactionId)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col w-full gap-3">
            {explorerUrl && (
              <Link 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                View on explorer <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            
            <Button 
              onClick={onClose}
              className="w-full bg-primary text-black"
            >
              Done
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}