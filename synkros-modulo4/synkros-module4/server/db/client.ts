// server/db/client.ts
//
// Wrapper delgado sobre `pg`. Se aísla acá a propósito: si el proyecto migra
// de Postgres directo al cliente de Supabase-JS, este es el único archivo
// que cambia -- los servicios de sync nunca importan `pg` directamente.

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
