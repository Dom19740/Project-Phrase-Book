import type { VercelRequest, VercelResponse } from '@vercel/node'

// Capacitor's documented default Android WebView origin is `https://localhost`
// (server.hostname defaults to "localhost", server.androidScheme defaults to "https" - this
// app's capacitor.config.ts overrides neither). The localhost dev-server ports cover `vite dev`
// / `vite preview` for local testing; they are not reachable by anyone outside the developer's
// own machine. This is a browser-enforced allowlist, not an access-control mechanism - curl,
// scripts, and server-to-server calls ignore CORS entirely. See
// docs/pre-production-audit/01-h1-translation-proxy-security-options.md, option 11.
//
// The hosted web build of the app (see app/vite.config.ts) is reachable at both its custom
// domain (app.travelchatter.dpbcreative.com) and its underlying Vercel project alias
// (project-travel-chatter.vercel.app, which Vercel keeps serving even once a custom domain is
// attached) - both are exact production origins only, not a wildcard over Vercel's
// per-branch/per-commit preview URLs, since this proxy is meant to serve one deployed web app
// rather than every preview build.
const ALLOWED_ORIGIN_PATTERN = /^https?:\/\/localhost(:\d+)?$|^https:\/\/(app\.travelchatter\.dpbcreative\.com|project-travel-chatter\.vercel\.app)$/

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin
  if (typeof origin === 'string' && ALLOWED_ORIGIN_PATTERN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id')
}
