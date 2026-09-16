import { randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LENGTH = 12

/**
 * Random, URL-safe, unguessable code for a share link. 12 chars from this 62-char alphabet is
 * ~71 bits of entropy - comfortably brute-force resistant against enumerating GET /api/share/:code,
 * especially combined with the IP rate limiter on that route (see shareGuard.ts).
 */
export function generateShareCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}
