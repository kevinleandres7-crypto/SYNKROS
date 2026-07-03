// __tests__/tokenEncryption.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
});

describe('tokenEncryption', () => {
  it('descifra exactamente el mismo texto que se cifró', async () => {
    const { encryptToken, decryptToken } = await import('../server/crypto/tokenEncryption');
    const original = 'ya29.a0AfH6SMC_un_access_token_de_ejemplo_bastante_largo';

    const encrypted = encryptToken(original);
    expect(encrypted.ciphertext).not.toContain(original);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it('genera un IV distinto en cada llamada (nunca reutiliza nonce)', async () => {
    const { encryptToken } = await import('../server/crypto/tokenEncryption');
    const a = encryptToken('mismo-texto');
    const b = encryptToken('mismo-texto');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('lanza error si el ciphertext fue alterado (tag de autenticación no coincide)', async () => {
    const { encryptToken, decryptToken } = await import('../server/crypto/tokenEncryption');
    const encrypted = encryptToken('token-secreto');
    const tampered = { ...encrypted, ciphertext: Buffer.from('datos-falsos').toString('base64') };
    expect(() => decryptToken(tampered)).toThrow();
  });
});
