import {
  openaiKeySchema,
  columnMappingSchema,
  byosCredentialsSchema,
} from '../onboarding';

describe('openaiKeySchema', () => {
  it('accepts sk- prefixed key', () => {
    expect(openaiKeySchema.safeParse('sk-abcdefghijklmnopqr').success).toBe(true);
  });
  it('rejects empty', () => {
    expect(openaiKeySchema.safeParse('').success).toBe(false);
  });
  it('rejects keys without sk- prefix', () => {
    expect(openaiKeySchema.safeParse('pk-abcdefghijklmnopqr').success).toBe(false);
  });
});

describe('columnMappingSchema', () => {
  const fullMappings = {
    confirmation_code: 'Booking Ref',
    listing_nickname: 'Property',
    check_in_date: 'Check In',
    check_out_date: 'Check Out',
    nights: 'Nights',
    net_accommodation_fare: 'Revenue',
    listing_id: 'Property ID',
  };

  it('accepts a complete mapping', () => {
    const result = columnMappingSchema.safeParse({
      mappings: fullMappings,
      sample_headers: ['Booking Ref', 'Property'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when a required field is missing', () => {
    const partial = { ...fullMappings } as Record<string, string>;
    delete partial.listing_id;
    const result = columnMappingSchema.safeParse({
      mappings: partial,
      sample_headers: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('byosCredentialsSchema', () => {
  it('accepts a valid pair', () => {
    const result = byosCredentialsSchema.safeParse({
      supabase_url: 'https://abcdef.supabase.co',
      supabase_service_key: 'eyJhbGciOiJIUzI1NiJ9xxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-supabase URL', () => {
    const result = byosCredentialsSchema.safeParse({
      supabase_url: 'https://example.com',
      supabase_service_key: 'eyJhbGciOiJIUzI1NiJ9xxxxxxxxxxxx',
    });
    expect(result.success).toBe(false);
  });
});
