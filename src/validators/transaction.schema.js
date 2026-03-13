import { z } from 'zod';

export const depositSchema = z.object({
  user_uuid: z.string().uuid(),
  method: z.enum(['binance', 'coinbase', 'metamask', 'trustwallet', 'fiat']),
  amount: z.number().positive(),
  currency: z.string().min(2),
  chain: z.enum(['ethereum', 'bsc']).optional()
  
});