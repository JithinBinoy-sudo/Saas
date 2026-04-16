import { randomBytes } from 'crypto';

// Deterministic 32-byte key for tests
process.env.ENCRYPTION_SECRET = randomBytes(32).toString('hex');

import { encrypt, decrypt } from '../encryption';

describe('encryption', () => {
  it('roundtrips plaintext', () => {
    const original = 'sk-proj-0123456789abcdef';
    const encoded = encrypt(original);
    expect(decrypt(encoded)).toBe(original);
  });

  it('produces different ciphertexts for the same plaintext (IV randomness)', () => {
    const a = encrypt('same-secret');
    const b = encrypt('same-secret');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same-secret');
    expect(decrypt(b)).toBe('same-secret');
  });

  it('throws when ciphertext is tampered', () => {
    const encoded = encrypt('do-not-touch');
    const buf = Buffer.from(encoded, 'base64');
    // Flip a bit in the ciphertext body (after iv+authTag = 28 bytes)
    buf[buf.length - 1] ^= 0x01;
    const tampered = buf.toString('base64');
    expect(() => decrypt(tampered)).toThrow();
  });
});
