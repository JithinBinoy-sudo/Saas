import { z } from 'zod';

export const REQUIRED_MAPPING_FIELDS = [
  'confirmation_code',
  'listing_nickname',
  'check_in_date',
  'check_out_date',
  'nights',
  'net_accommodation_fare',
  'listing_id',
] as const;

export const openaiKeySchema = z
  .string()
  .min(20)
  .refine((v) => v.startsWith('sk-'), { message: 'Must start with "sk-"' });

export const columnMappingSchema = z
  .object({
    mappings: z.record(z.string(), z.string()),
    custom_fields: z.array(z.string()).optional().default([]),
    skipped: z.array(z.string()).optional().default([]),
    sample_headers: z.array(z.string()),
  })
  .refine(
    (v) => REQUIRED_MAPPING_FIELDS.every((k) => k in v.mappings && v.mappings[k].length > 0),
    {
      message: `mappings must include all required fields: ${REQUIRED_MAPPING_FIELDS.join(', ')}`,
      path: ['mappings'],
    }
  );

export const byosCredentialsSchema = z.object({
  supabase_url: z
    .string()
    .url()
    .refine((v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v), {
      message: 'Must be a valid Supabase project URL (*.supabase.co)',
    }),
  supabase_service_key: z.string().min(20),
});

/** Deploy step: same as credentials plus optional DB password for auto-bootstrap via Postgres. */
export const byosDeployRequestSchema = byosCredentialsSchema.extend({
  database_password: z.string().optional(),
});

export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;
export type ByosCredentialsInput = z.infer<typeof byosCredentialsSchema>;
export type ByosDeployRequestInput = z.infer<typeof byosDeployRequestSchema>;
