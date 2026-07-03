// server/db/authTokensRepository.ts
//
// Única puerta de entrada/salida a la tabla auth_tokens. Ningún otro archivo
// del backend debería hacer un INSERT/SELECT directo sobre esta tabla --
// así garantizamos que CUALQUIER lectura/escritura pasa por el cifrado.
//
// Detalle de seguridad importante: access token y refresh token se cifran
// con IVs INDEPENDIENTES. Reusar el mismo IV de AES-GCM para dos ciphertexts
// distintos bajo la misma clave rompe la garantía de autenticación de GCM
// (nonce reuse) -- por eso la tabla tiene columnas de iv/tag separadas para
// cada token, aunque eso signifique dos pares de columnas en vez de uno.

import { query } from './client';
import { encryptToken, decryptToken } from '../crypto/tokenEncryption';

export type Provider = 'google' | 'outlook' | 'apple';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
}

export interface RawTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
}

export async function upsertAuthTokens(
  userId: string,
  provider: Provider,
  tokens: RawTokens
): Promise<void> {
  const encryptedAccess = encryptToken(tokens.accessToken);
  // El refresh token no siempre viene (Google solo lo emite la primera vez
  // que el usuario da consentimiento) -- si no viene, no se sobreescribe el
  // que ya existía en la fila.
  const encryptedRefresh = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

  await query(
    `insert into auth_tokens
       (user_id, provider,
        encrypted_access_token, encryption_iv, encryption_tag,
        encrypted_refresh_token, refresh_encryption_iv, refresh_encryption_tag,
        scope, expires_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (user_id, provider) do update set
       encrypted_access_token   = excluded.encrypted_access_token,
       encryption_iv            = excluded.encryption_iv,
       encryption_tag           = excluded.encryption_tag,
       encrypted_refresh_token  = coalesce(excluded.encrypted_refresh_token, auth_tokens.encrypted_refresh_token),
       refresh_encryption_iv    = coalesce(excluded.refresh_encryption_iv, auth_tokens.refresh_encryption_iv),
       refresh_encryption_tag   = coalesce(excluded.refresh_encryption_tag, auth_tokens.refresh_encryption_tag),
       scope                    = excluded.scope,
       expires_at               = excluded.expires_at,
       updated_at               = now()`,
    [
      userId,
      provider,
      encryptedAccess.ciphertext,
      encryptedAccess.iv,
      encryptedAccess.tag,
      encryptedRefresh?.ciphertext ?? null,
      encryptedRefresh?.iv ?? null,
      encryptedRefresh?.tag ?? null,
      tokens.scope ?? null,
      tokens.expiresAt ?? null,
    ]
  );
}

export async function getAuthTokens(
  userId: string,
  provider: Provider
): Promise<StoredTokens | null> {
  const rows = await query<{
    encrypted_access_token: string;
    encryption_iv: string;
    encryption_tag: string;
    encrypted_refresh_token: string | null;
    refresh_encryption_iv: string | null;
    refresh_encryption_tag: string | null;
    expires_at: Date | null;
    scope: string | null;
  }>(
    `select encrypted_access_token, encryption_iv, encryption_tag,
            encrypted_refresh_token, refresh_encryption_iv, refresh_encryption_tag,
            expires_at, scope
     from auth_tokens where user_id = $1 and provider = $2`,
    [userId, provider]
  );

  const row = rows[0];
  if (!row) return null;

  const accessToken = decryptToken({
    ciphertext: row.encrypted_access_token,
    iv: row.encryption_iv,
    tag: row.encryption_tag,
  });

  const refreshToken =
    row.encrypted_refresh_token && row.refresh_encryption_iv && row.refresh_encryption_tag
      ? decryptToken({
          ciphertext: row.encrypted_refresh_token,
          iv: row.refresh_encryption_iv,
          tag: row.refresh_encryption_tag,
        })
      : null;

  return {
    accessToken,
    refreshToken,
    expiresAt: row.expires_at,
    scope: row.scope,
  };
}
