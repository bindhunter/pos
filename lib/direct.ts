import { z } from 'zod';
import { ChainId } from '@/constants/ChainToken';

export const SettleFormSchema = z.object({
  amount: z.number().min(1, 'Minimum amount is $1').max(999, 'Maximum amount is $999'),
  settlementDetails: z.object(
    {
      token: z.object({
        symbol: z.string(),
        name: z.string(),
        address: z.string(),
        decimals: z.number(),
        logoUrl: z.string(),
      }),
      chain: z.object({
        id: z.nativeEnum(ChainId),
        name: z.string(),
        nativeCurrency: z.string(),
        logoUrl: z.string(),
        rpcUrl: z.string().optional(),
      }),
    },
    { required_error: 'Please select a token for payment' }
  ),
  selectedFriend: z.object(
    {
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
      walletAddress: z.string(),
      bindPayApiKey: z.string(),
      settlementDetails: z.object({
        network: z.string(),
        token: z.string(),
      }),
    },
    { required_error: 'Please select a recipient' }
  ),
});

export const RequestFormSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is $1').max(99999, 'Maximum amount is $999'),
  selectedFriend: z.object(
    {
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
      walletAddress: z.string(),
    },
    { required_error: 'Please select a recipient' }
  ),
});

export const PaymentLinkFormSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  settlementDetails: z.object(
    {
      token: z.object({
        symbol: z.string(),
        name: z.string(),
        address: z.string(),
        decimals: z.number(),
        logoUrl: z.string(),
      }),
      chain: z.object({
        id: z.nativeEnum(ChainId),
        name: z.string(),
        nativeCurrency: z.string(),
        logoUrl: z.string(),
        rpcUrl: z.string().optional(),
      }),
    },
    { required_error: 'Please select a token for payment' }
  ),
  selectedFriend: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    walletAddress: z.string(),
    bindPayApiKey: z.string().nullable(),
    settlementDetails: z
      .object({
        token: z.string(),
        network: z.string(),
      })
      .nullable(),
  }),
}).superRefine((data, ctx) => {
  console.log('Validating form data:', data);
  if (!data.settlementDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a token for payment",
      path: ["settlementDetails"]
    });
  }
});