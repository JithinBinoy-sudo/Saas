import { z } from 'zod';

export const adminInitialSetupSchema = z
  .object({
    /** When true, skip Supabase password update; caller must already be signed in. */
    keepCurrentPassword: z.boolean().optional().default(true),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.keepCurrentPassword) return;
    const pwd = data.password ?? '';
    const confirm = data.confirmPassword ?? '';
    if (pwd.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at least 8 characters',
        path: ['password'],
      });
    }
    if (confirm.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at least 8 characters',
        path: ['confirmPassword'],
      });
    }
    if (pwd.length >= 8 && confirm.length >= 8 && pwd !== confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export type AdminInitialSetupInput = z.infer<typeof adminInitialSetupSchema>;
