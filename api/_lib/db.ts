import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL

if (!url) {
  // Thrown at import time so a misconfigured deploy fails loudly on the first
  // request instead of silently returning empty rooms.
  throw new Error('DATABASE_URL is not set')
}

/**
 * One-shot HTTP queries. There is no persistent TCP connection per invocation,
 * so a lot of concurrent functions cannot exhaust the database's connections.
 * Everything that has to be atomic lives in a Postgres function (see
 * db/schema.sql), so a single statement per request is enough.
 */
export const sql = neon(url)

/** Postgres error codes the schema raises on purpose, mapped to HTTP statuses. */
const STATUS_BY_CODE: Record<string, number> = {
  '42501': 403, // not allowed
  '22023': 400, // bad input
  '23505': 409, // conflict / already exists
  '53400': 429, // slow down
}

export interface DbError {
  status: number
  message: string
}

/** Turns a thrown Postgres error into something safe to send to the client. */
export function dbError(err: unknown): DbError {
  const e = err as { code?: string; message?: string }
  const status = (e.code ? STATUS_BY_CODE[e.code] : undefined) ?? 500
  if (status === 500) {
    console.error(err)
    return { status, message: 'Something went wrong.' }
  }
  return { status, message: e.message ?? 'Something went wrong.' }
}
