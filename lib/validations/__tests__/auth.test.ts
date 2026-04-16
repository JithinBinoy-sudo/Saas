import { signupSchema } from '../auth';

describe('signupSchema', () => {
  const valid = {
    company_name: 'Acme Property Group',
    email: 'admin@acme.com',
    password: 'supersecret',
  };

  it('accepts a valid payload', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing company_name', () => {
    const { success } = signupSchema.safeParse({ ...valid, company_name: '' });
    expect(success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const { success } = signupSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(success).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', () => {
    const { success } = signupSchema.safeParse({ ...valid, password: 'short' });
    expect(success).toBe(false);
  });

  it('rejects company_name longer than 100 chars', () => {
    const { success } = signupSchema.safeParse({ ...valid, company_name: 'a'.repeat(101) });
    expect(success).toBe(false);
  });
});
