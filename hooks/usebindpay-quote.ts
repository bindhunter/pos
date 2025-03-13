"use client"

import { useState } from 'react'
import { Address } from 'viem'
import { ChainId } from '@/constants/ChainToken'

export interface QuoteRequest {
  fromChain: ChainId
  fromToken: Address
  fromAddress: Address
  usdAmount: number
  recipientApiKey: string
}

export interface QuoteResponse {
  message: string;
  transactionId: string;
  type?: "Direct" | "Provider";
  // For direct transfers
  transferTxParams?: {
    from: `0x${string}`;
    to: `0x${string}`;
    gas: `0x${string}`;
    gasPrice: `0x${string}`;
    data: `0x${string}`;
    nonce: `0x${string}`;
    value: `0x${string}`;
  };
  // For cross-chain transfers
  approvalTxParams?: {
    from: `0x${string}`;
    to: `0x${string}`;
    gas: `0x${string}`;
    gasPrice: `0x${string}`;
    data: `0x${string}`;
    nonce: `0x${string}`;
    value: `0x${string}`;
  };
  transactionRequest?: {
    to: `0x${string}`;
    from: `0x${string}`;
    data: `0x${string}`;
    value: `0x${string}`;
    gasPrice: `0x${string}`;
    gasLimit: `0x${string}`;
  };
}

export function usebindpayQuote() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = async ({
    fromChain,
    fromToken,
    fromAddress,
    usdAmount,
    recipientApiKey
  }: QuoteRequest): Promise<QuoteResponse | null> => {
    // Check if we have a valid API key
    if (!recipientApiKey) {
      console.error('No recipient API key provided');
      setError('No API key provided')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Log the API key being used (first few characters for security)
      console.log('Using recipient API key:', 
        recipientApiKey.substring(0, 4) + '...' + recipientApiKey.substring(recipientApiKey.length - 4));
      // Ensure fromToken is properly formatted as a string
      const tokenAddress = typeof fromToken === 'string' ? fromToken : String(fromToken);
      
      // Create request body with proper formatting
      const requestBody = {
        fromChain: String(fromChain),
        fromToken: tokenAddress,
        fromAddress: fromAddress,
        usdAmount: usdAmount.toString()
      };
      
      console.log('Quote request body:', requestBody);
      
      const response = await fetch('https://api.bindpay.xyz/v1/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': recipientApiKey,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quote API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Quote received:', data);
      return data
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the quote')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    fetchQuote,
    loading,
    error,
    isReady: true
  }
}