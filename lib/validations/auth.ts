import { z } from 'zod';

export const signupSchema = z.object({
  company_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignupInput = z.infer<typeof signupSchema>;
