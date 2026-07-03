// server/crypto/tokenEncryption.ts
//
// Ningún access/refresh token de Google u Outlook toca la base de datos en
// texto plano. Se cifra acá con AES-256-GCM (autenticado -- detecta si el
// ciphertext fue alterado, no solo lo oculta) antes de que
// googleCalendarSync.ts lo persista.
//
// La clave (ENCRYPTION_KEY) vive en el secret manager del backend (ej. AWS
// Secrets Manager, Supabase Vault), nunca en el repo ni en la misma base de
// datos que los tokens cifrados -- si la DB se filtra sola, los tokens
// cifrados no sirven de nada sin esta clave.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // recomendado para GCM (96 bits)

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada. Generarla con: ' +
        `openssl rand -hex 32`
    );
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hex de 32 bytes (64 caracteres).');
  }
  return key;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

export function encryptToken(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptToken(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(), // lanza si el tag de autenticación no coincide (dato alterado)
  ]);

  return decrypted.toString('utf8');
}
