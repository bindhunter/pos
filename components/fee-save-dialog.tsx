'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { TokenNetworkDisplay } from './token-network-display';
import { getNetworkName, getTokenSymbol } from '@/lib/token-chain-parser';
import { Address } from 'viem';
import { ChainId } from '@/constants/ChainToken';
import { DialogTitle } from '@/components/ui/dialog';

interface FeeSaveDialogProps {
  recipient?: {
    settlementDetails: { token: string; network: string } | null;
    name: string;
    id: string;
    email: string | null;
    walletAddress: string;
    bindPayApiKey: string;
  };
  onClose: () => void;
}

export function FeeSaveDialog({ recipient, onClose }: FeeSaveDialogProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Add console logs to debug the values
  console.log('Settlement details:', recipient?.settlementDetails);
  
  const { token, network } = recipient?.settlementDetails || {};
  console.log('Token:', token, 'Network:', network);
  
  // Convert network to number if it's a string
  const chainId = network ? (typeof network === 'string' ? parseInt(network, 10) : network as unknown as ChainId) : undefined;
  console.log('Parsed chainId:', chainId);
  
  const tokenSymbol = token ? getTokenSymbol(token as Address, chainId as ChainId) : '';
  const networkName = chainId ? getNetworkName(chainId as ChainId) : '';
  
  console.log('Token Symbol:', tokenSymbol, 'Network Name:', networkName);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-secondary p-6 rounded-xl w-[90vw] max-w-[400px] relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <div className="space-y-4">
          {/* Header */}
          <DialogTitle className="text-2xl font-bold mb-4 text-foreground">Choose Payment Option</DialogTitle>

          {/* Settlement Preferences Tip
                <div className="bg-[#161616] border border-gray-700 p-3 rounded-lg">
          <p className="text-sm text-white">
            💡 Look for users&apos; settlement preferences!
          </p>
        </div> */}

          {/* Token and Network Display */}
          <div className="flex items-center gap-4 rounded-lg">
            <TokenNetworkDisplay 
              tokenAddress={token || undefined} 
              chainId={chainId}
            />
            <div className="flex-1">
              <p className="text-sm text-foreground-secondary">
                {`Send ${recipient?.name} ${tokenSymbol} to save on conversion fees. You can also send any token on any supported blockchain!`}
              </p>
            </div>
          </div>

          {/* Don't show again toggle
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-500 cursor-pointer flex items-center gap-2 mt-2 mb-2">
              <Switch id="dontShow" className="data-[state=checked]:bg-[#E1FF0B]" />
              Don&apos;t show this again
            </label>
          </div> */}

          {/* Continue button */}
          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}