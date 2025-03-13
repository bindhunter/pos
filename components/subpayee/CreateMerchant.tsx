'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { chains, tokens } from '@/constants/ChainTokenData';
import { ChainId } from '@/constants/ChainToken';
import { Textarea } from '@/components/ui/textarea';

// Create a merchant validation schema
const createMerchantSchema = z.object({
  name: z.string().min(2, { message: "Merchant name must be at least 2 characters" }),
  description: z.string().optional(),
  network: z.string().min(1, { message: "Network is required" }),
  token: z.string().min(1, { message: "Settlement token is required" }),
  walletAddress: z.string().min(1, { message: "Wallet address is required" }),
  image: z.any().optional(),
});

type CreateMerchantFormValues = z.infer<typeof createMerchantSchema>;

const defaultValues: Partial<CreateMerchantFormValues> = {
  name: '',
  description: '',
  network: undefined,
  token: undefined,
  walletAddress: '',
  image: null,
};

interface CreateMerchantProps {
  onSuccess?: (merchantData: {
    id: string;
    name: string;
    walletAddress: string;
    apiKey: string;
    settlementDetails: {
      token: string;
      network: string;
    }
  }) => void;
}

export function CreateMerchant({ onSuccess }: CreateMerchantProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<CreateMerchantFormValues>({
    resolver: zodResolver(createMerchantSchema),
    defaultValues,
    mode: 'onChange',
  });


  const selectedNetwork = form.watch('network');

  const getNetworkTokens = () => {
    if (!selectedNetwork) return [];

    const chain = Object.values(chains).find((c) => c.name.toLowerCase() === selectedNetwork);

    if (!chain) return [];

    return tokens[chain.id] || [];
  };

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);
    

  async function onSubmit(data: CreateMerchantFormValues) {
    try {
      setIsSubmitting(true);

      // Get chain ID from the selected network name
      const selectedChain = Object.values(chains).find(
        (c) => c.name.toLowerCase() === data.network
      );
      
      if (!selectedChain) {
        throw new Error('Invalid network selected');
      }

      // Find the token object to get its address
      const chainTokens = tokens[selectedChain.id];
      if (!chainTokens) {
        throw new Error('No tokens found for the selected network');
      }

      const selectedToken = chainTokens.find(
        (t) => t.symbol.toLowerCase() === data.token.toLowerCase()
      );

      if (!selectedToken) {
        throw new Error('Invalid token selected');
      }

      // Prepare subpayee data for API
      const subpayeeData = {
        name: data.name,
        toChain: selectedChain.id.toString(),
        toToken: selectedToken.address,
        toAddress: data.walletAddress,
        // Include description if provided
        ...(data.description && { description: data.description }),
      };

      // Make API request to create subpayee using Next.js fetch
      const response = await fetch('https://api.bindpay.xyz/v1/create-subpayee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_BINDPAY_API_KEY || '',
        },
        body: JSON.stringify(subpayeeData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (responseData) {
        toast.success('Merchant created successfully!');
        
        // Create a complete merchant data object with token ADDRESS
        const merchantData = {
          id: responseData.id || `merchant-${Date.now()}`,
          name: data.name,
          walletAddress: data.walletAddress,
          apiKey: responseData.apiKey || process.env.NEXT_PUBLIC_BINDPAY_API_KEY || '',
          settlementDetails: {
            token: selectedToken.address,  // Store the token ADDRESS, not symbol
            network: selectedChain.id.toString(),
          }
        };
        
        // Call onSuccess callback with the complete merchant data
        if (onSuccess) {
          console.log('Calling onSuccess with merchant data:', merchantData);
          onSuccess(merchantData);
        }
      } else {
        toast.error('Failed to create merchant');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      form.setError('root', {
        type: 'server',
        message: 'An unexpected error occurred',
      });
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-background rounded-lg border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="space-y-1 text-center">
            <h1 className="text-3xl font-bold">Create a Test Merchant</h1>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Merchant Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Name</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          form.formState.errors.name && 'border-destructive focus-visible:ring-destructive'
                        )}
                        placeholder="Enter merchant name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Network Field */}
              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Network</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(form.formState.errors.network && 'border-red-500 focus-visible:ring-red-500')}
                        >
                          <SelectValue placeholder="Select Network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card">
                        {Object.values(chains).map((chain) => (
                          <SelectItem 
                            key={chain.id} 
                            value={chain.name.toLowerCase()}
                            disabled={chain.id === ChainId.SOLANA || chain.id === ChainId.LINEA || chain.id === ChainId.SCROLL}
                          >
                            <div className="flex items-center gap-2">
                              <img src={chain.logoUrl} alt={chain.name} className="w-4 h-4" />
                              {chain.name}
                              {(chain.id === ChainId.SOLANA || chain.id === ChainId.LINEA || chain.id === ChainId.SCROLL) ? " [coming soon]" : ""}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Settlement Token Field */}
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Token</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedNetwork}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(form.formState.errors.token && 'border-red-500 focus-visible:ring-red-500')}
                        >
                          <SelectValue placeholder="Select Settlement Token" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card">
                        {getNetworkTokens().map((token) => (
                          <SelectItem key={token.address} value={token.symbol.toLowerCase()}>
                            <div className="flex items-center gap-2">
                              <img src={token.logoUrl} alt={token.name} className="w-4 h-4" />
                              {token.symbol}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* Manual wallet address input if not connected */}
              
                <FormField 
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Wallet Address manually"
                          {...field}
                          className={cn(
                            form.formState.errors.walletAddress && 'border-red-500 focus-visible:ring-red-500'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {/* Display root error if any */}
              {form.formState.errors.root && (
                <div className="text-sm text-red-500 text-center">{form.formState.errors.root.message}</div>
              )}
            </CardContent>
            <div className="px-6 pb-6 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? 'Creating...' : 'Create Merchant'}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}