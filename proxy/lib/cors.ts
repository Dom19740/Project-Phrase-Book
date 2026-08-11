import type { VercelRequest, VercelResponse } from '@vercel/node'

// Capacitor's documented default Android WebView origin is `https://localhost`
// (server.hostname defaults to "localhost", server.androidScheme defaults to "https" — this
// app's capacitor.config.ts overrides neither). The localhost dev-server ports cover `vite dev`
// / `vite preview` for local testing; they are not reachable by anyone outside the developer's
// own machine. This is a browser-enforced allowlist, not an access-control mechanism — curl,
// scripts, and server-to-server calls ignore CORS entirely. See
// docs/pre-production-audit/01-h1-translation-proxy-security-options.md, option 11.
const ALLOWED_ORIGIN_PATTERN = /^https?:\/\/localhost(:\d+)?$/

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin
  if (typeof origin === 'string' && ALLOWED_ORIGIN_PATTERN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id')
}
