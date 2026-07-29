import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE = 'sf_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const secret = process.env.SESSION_SECRET

if (!secret) {
  throw new Error('SESSION_SECRET is not set')
}

// --- passwords -------------------------------------------------------------

/** scrypt from node:crypto, so there is no extra dependency to keep updated. */
export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err)
      else resolve(`scrypt$${salt.toString('hex')}$${key.toString('hex')}`)
    })
  })
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return Promise.resolve(false)
  const expected = Buffer.from(keyHex, 'hex')
  return new Promise((resolve, reject) => {
    scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, (err, key) => {
      if (err) reject(err)
      else resolve(key.length === expected.length && timingSafeEqual(key, expected))
    })
  })
}

// --- cookie ----------------------------------------------------------------

// `vercel dev` serves over plain http, where a Secure cookie is dropped.
const SECURE = process.env.VERCEL_ENV ? '; Secure' : ''

function sign(value: string): string {
  return createHmac('sha256', secret as string).update(value).digest('base64url')
}

/** Sets an HttpOnly cookie holding `userId.expiry.signature`. */
export function setSessionCookie(res: VercelResponse, userId: string) {
  const body = `${userId}.${Date.now() + MAX_AGE_MS}`
  const value = `${body}.${sign(body)}`
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${SECURE}; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  )
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax${SECURE}; Max-Age=0`)
}

/** The signed-in user's id, or null. Never trust an id from the request body. */
export function getUserId(req: VercelRequest): string | null {
  const raw = req.cookies?.[COOKIE]
  if (!raw) return null
  const cut = raw.lastIndexOf('.')
  if (cut < 0) return null
  const body = raw.slice(0, cut)
  const signature = raw.slice(cut + 1)

  const expected = sign(body)
  if (signature.length !== expected.length) return null
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  const [userId, expiry] = body.split('.')
  if (!userId || !expiry || Number(expiry) < Date.now()) return null
  return userId
}

/** Reads the session or answers 401 and returns null. */
export function requireUser(req: VercelRequest, res: VercelResponse): string | null {
  const id = getUserId(req)
  if (!id) {
    res.status(401).json({ error: 'Not signed in' })
    return null
  }
  return id
}

/** Rejects anything but the given method. */
export function requireMethod(
  req: VercelRequest,
  res: VercelResponse,
  ...methods: string[]
): boolean {
  if (methods.includes(req.method ?? '')) return true
  res.setHeader('Allow', methods.join(', '))
  res.status(405).json({ error: 'Method not allowed' })
  return false
}
