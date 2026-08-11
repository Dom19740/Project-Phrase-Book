# H1 Deep Dive — Translation Proxy Security Architecture Options

**Companion to:** [`00-risk-summary.md`](./00-risk-summary.md) finding H1
**Date:** 2026-08-07
**Status:** Research only. No code has been changed. This document is an options analysis to inform a decision, not an implementation.

## Framing

The app is deliberately anonymous and account-free. That constraint is accepted as a product requirement here, not treated as a gap to close. Given that, **no option below can make the endpoint impossible to abuse** — a public mobile app calling a public HTTPS endpoint is fundamentally reachable by anyone who wants to reach it. The realistic, achievable goal is:

1. Make it meaningfully harder to call the endpoint at volume than to just... use the app.
2. Bound the maximum possible damage per request and per time window, regardless of how well the identity layer holds up.
3. Have a hard, out-of-band kill switch that works even if every application-level control fails.

Every option below is evaluated against that goal, not against "can this be bypassed" in isolation — everything can be, eventually. The question is cost-to-bypass versus value-to-attacker, and blast radius if it's bypassed anyway.

---

## Why an embedded secret cannot be treated as authentication

Two of the options below (2 and 4) involve a secret or signing key shipped inside the app. Before evaluating them, it's worth being explicit about why this can never be "strong" — this reasoning applies to both options, so it's stated once here rather than repeated.

An Android APK is a ZIP file. Anyone can:
- Unzip it and read `classes.dex`, resources, and assets directly.
- Run it through free, widely available decompilers (`jadx`, `apktool`, `dex2jar`) to get readable-enough Java/Kotlin source in minutes.
- If the secret is obfuscated or computed at runtime, attach a debugger or a dynamic instrumentation tool (`Frida`, `objection`) to the *running* app and simply log whatever value it computes and sends — this defeats obfuscation entirely, since the app must produce the real, usable secret at runtime for its own request to succeed.
- If the app pins TLS certificates, tools like `Frida` + `mitmproxy` routinely bypass certificate pinning on a rooted or patched device to observe plaintext traffic and headers directly.

None of this requires special skill — it's a well-documented, one-afternoon process for anyone motivated enough to write a scraping script against your API in the first place (which is the exact population this control is meant to deter). Once extracted, the secret is:
- **Permanent** until you ship an app update (Play Store review + user update uptake, realistically days to weeks).
- **Shareable** — it can be posted publicly, at which point it protects nothing for anyone.
- **Indistinguishable from a genuine request** — the server has no way to tell "the real app sent this" from "someone replaying the extracted secret sent this," because they are bit-for-bit the same request.

This is why options 2 and 4 are described below as **raising the cost of casual/naive abuse**, not as authentication, and why they should never be the only control in front of a metered, billable API. This is also precisely the problem Google Play Integrity (option 5) is designed to solve differently — it doesn't ship a secret at all; it asks Google's own infrastructure, at request time, to attest to the app's and device's genuineness, which cannot be extracted from the APK because it was never in it.

---

## Option-by-option analysis

### 1. Current approach — client-generated `X-Device-Id`

| | |
|---|---|
| **How it works** | Random UUID generated once via `crypto.randomUUID()`, stored in `localStorage`, sent as a header, used as the Upstash rate-limit bucket key (30 req/hr). |
| **Protects against** | Accidental abuse from a single install (e.g. a retry-loop bug), and keeps one real user's usage isolated from another's for fairness/quota purposes. |
| **Does NOT protect against** | Deliberate abuse of any kind. There is no proof the header came from the real app at all — `curl -H "X-Device-Id: aaaaaaaa"` satisfies every check in the current handlers (`typeof === 'string' && length >= 8`). |
| **Bypass difficulty** | Trivial — seconds, no tooling required. |
| **Implementation complexity** | Already implemented. |
| **New dependency** | None. |
| **Works with anonymous app** | Yes — it *is* the anonymous-identity building block, just not a security one on its own. |
| **Impact on legitimate users** | None. |
| **Likely cost** | None. |
| **Appropriate for this app** | Keep it — but only as a UX/fairness signal layered under a real control, never as the control itself. |

### 2. Client-generated secret/header (static or obfuscated key embedded in the app)

| | |
|---|---|
| **How it works** | A secret string (or an HMAC key) is embedded in the app at build time; every request includes a value derived from it; server checks the value matches. |
| **Protects against** | The most casual class of abuse — someone who opens devtools, copies a request, and replays it without ever looking at the app's code. Also stops accidental discovery by search engines/crawlers hitting the bare URL. |
| **Does NOT protect against** | Anyone willing to decompile the APK (see callout above) — after which the secret is public and permanent until an app update. **This is explicitly not authentication — see the callout section above.** |
| **Bypass difficulty** | Low-moderate one-time effort (an afternoon), then trivial and permanent thereafter. |
| **Implementation complexity** | Low. |
| **New dependency** | None (Node's built-in `crypto` suffices). |
| **Works with anonymous app** | Yes. |
| **Impact on legitimate users** | None. |
| **Likely cost** | None. |
| **Appropriate for this app** | Only as a cheap *additional* speed bump alongside real controls (server-side limits, Play Integrity) — never alone, and never described to stakeholders as "securing" the endpoint. |

### 3. Server-issued anonymous session/token

| | |
|---|---|
| **How it works** | App calls a `/session` endpoint on launch; server mints a short-lived signed token; subsequent translate calls present the token instead of (or alongside) the device-id header. |
| **Protects against** | Lets you shorten the "blast window" of any one identity (tokens expire), and gives you a clean revocation point. Useful as *infrastructure* for stronger checks (see combination below). |
| **Does NOT protect against** | On its own, nothing meaningful — if `/session` itself has no gate, a script just calls it repeatedly to mint fresh tokens, which is no harder than the current device-id approach plus one extra round trip. This is a chicken-and-egg problem: the session endpoint needs its own protection to be worth anything. |
| **Bypass difficulty** | Trivial unless combined with something that gates token issuance (e.g. Play Integrity or IP limiting on `/session` itself). |
| **Implementation complexity** | Moderate — new endpoint, signing/verification, expiry handling. |
| **New dependency** | Possibly (a JWT library), though HMAC via Node's built-in `crypto` avoids one. |
| **Works with anonymous app** | Yes. |
| **Impact on legitimate users** | Negligible if implemented as an invisible background refresh. |
| **Likely cost** | Minimal extra compute/Redis. |
| **Appropriate for this app** | Not worth it as a standalone measure. Only worth building if you later adopt Play Integrity and want to cache its verdict behind a short-lived token rather than re-attesting on every single translate call. |

### 4. Signed short-lived requests (per-request HMAC + timestamp + nonce)

| | |
|---|---|
| **How it works** | Each request is signed with an embedded key, includes a timestamp and one-time nonce; server checks signature validity, freshness (e.g. within 60s), and that the nonce hasn't been seen before (Redis set). |
| **Protects against** | Naive request replay (capturing and resending a request verbatim later). |
| **Does NOT protect against** | The same fundamental issue as option 2 — the key is still embedded and extractable (see callout above). Once extracted, an attacker can sign *new*, valid, freshly-timestamped requests just as fast as the real app can — replay protection doesn't help if the attacker can forge fresh signatures. |
| **Bypass difficulty** | Same one-time extraction effort as option 2, then trivial and ongoing. |
| **Implementation complexity** | Moderate-high — clock-skew tolerance, nonce storage/expiry, more failure modes to debug (clients with wrong device clocks get mysterious failures). |
| **New dependency** | None required, but adds Redis writes per request for the nonce cache. |
| **Works with anonymous app** | Yes. |
| **Impact on legitimate users** | Real risk of false failures on devices with incorrect clocks — a genuine, if usually minor, support burden. |
| **Likely cost** | Minor extra Redis operations. |
| **Appropriate for this app** | No — meaningfully more complexity than option 2 for the same actual ceiling (an extractable embedded key). Not recommended. |

### 5. Google Play Integrity API

| | |
|---|---|
| **How it works** | The app requests an integrity token from Google Play services at request time ("standard" requests — a few hundred ms, suited to per-call use). The app sends that token to your server, which verifies it against Google's Play Integrity verification service. The verdict tells you, cryptographically attested by Google — not by anything shipped in your APK — whether the request is coming from your genuine, unmodified app, obtained through a legitimate channel, running on a device Google considers un-tampered (not rooted/an emulator/repackaged). |
| **Protects against** | Scripted/bot callers that are not the real app on a real device — this is the closest realistic thing to "proof of genuine client" available for a public Android app, precisely because the secret never leaves Google's servers and so can't be extracted from your APK the way options 2/4's keys can. |
| **Does NOT protect against** | A real person automating their *own*, genuinely-installed copy of the app on their own real device (Integrity attests to app+device genuineness, not to human-vs-script intent) — though this at least ties abuse to a real device the attacker controls, which is a meaningfully smaller/costlier attack surface than free-for-all scripting. Also does not help against sideloaded installs (outside Play) unless you accept that those will fail the check — worth confirming this matches your distribution plan (Play Store only vs. also side-loadable APKs/other stores) before adopting. Doesn't stop a well-resourced attacker running rooted/patched-Play-Services emulator farms, though Google actively hardens against this and it is well beyond typical API-scraping effort. |
| **Bypass difficulty** | High for casual/scripted abuse; requires real device-integrity evasion for sustained abuse, which is nontrivial and actively contested by Google. |
| **Implementation complexity** | Moderate — a well-documented Google library on the Android side plus one server-side verification call; no custom cryptography to design yourselves. |
| **New dependency** | **Yes** — `com.google.android.play:integrity` on the Android side, plus a server-side call to Google's verification endpoint. Per the audit ground rules, this needs your explicit approval before implementation. |
| **Works with anonymous app** | Yes — no user account required, only Play Store distribution and linking the app to a Google Cloud project (needed only for the Integrity API call, not for user accounts or data). |
| **Impact on legitimate users** | Effectively invisible for the vast majority of users on the standard flow. Fails or degrades on devices without Google Play Services (some China-market Android devices, de-Googled ROMs like GrapheneOS-without-gapps) — worth deciding upfront how those users should be treated (blocked from translation but app still usable, since translation already degrades gracefully). |
| **Likely cost** | Free within Play Integrity's generous standard quotas; the only real cost is the added latency (a few hundred ms) per verdict unless cached. |
| **Appropriate for this app** | **Yes — this is the strongest realistic control available for this exact threat model** (anonymous, no-account, thin proxy in front of a metered third-party API), provided the app is Play-Store-distributed. Recommended as the core identity layer, combined with the server-side limits below. |

### 6. IP-based rate limiting

| | |
|---|---|
| **How it works** | Bucket requests by source IP instead of (or in addition to) the client-supplied device-id — either via Vercel's built-in WAF rate limiting at the edge (no function code runs at all for over-limit requests), or manually via `@upstash/ratelimit` keyed by IP. |
| **Protects against** | A single IP hammering the endpoint, without relying on anything the client can simply change (a device-id is a value the client chooses; an IP is not). |
| **Does NOT protect against** | Distributed abuse (rotating proxies, botnets) — cheap to defeat for a motivated attacker, though it raises effort above zero. |
| **Bypass difficulty** | Easy for a motivated attacker (cheap rotating-proxy services exist), but not free. |
| **Implementation complexity** | Low — either a Vercel WAF dashboard rule (no code) or one more `ratelimit.limit()` call keyed by IP (reuses the existing Upstash client). |
| **New dependency** | None either way — Vercel WAF rate limiting is a platform feature (no npm package), and the Upstash-based version reuses the library already in `proxy/lib/redis.ts`. |
| **Works with anonymous app** | Yes — no identity concept needed. |
| **Impact on legitimate users** | **This is the one caveat worth flagging clearly**: mobile carriers commonly put large numbers of genuinely distinct users behind the same carrier-grade NAT IP. This app's users are, by nature, on mobile data or hotel/airport wifi while traveling — exactly the conditions where IP-sharing across unrelated real users is common. An IP-only limit risks rate-limiting innocent bystanders who happen to share a carrier IP with someone else's heavy (or abusive) usage. This is why IP limiting should be a secondary, more generous bucket, not the primary or sole gate. |
| **Likely cost** | Free at this app's scale via Upstash; Vercel's own WAF rate limiting is a Pro-plan feature (usage-based, but not billed for the denied/limited requests themselves). |
| **Appropriate for this app** | Yes, as a secondary/looser bucket stacked with device-id (see option 7) — not as the sole or primary control given the NAT-sharing caveat above. |

### 7. Device + IP combined rate limiting

| | |
|---|---|
| **How it works** | Enforce two independent buckets per request — e.g. 30/hr per device-id **and** a separate, more generous limit (e.g. 100–150/hr) per IP — so a request must pass both. |
| **Protects against** | Meaningfully more than either alone: a rotated device-id from the same IP is still caught by the IP bucket; a botnet rotating IPs but reusing (or not bothering to rotate) device-ids is still caught by the device bucket. |
| **Does NOT protect against** | A genuinely distributed attacker rotating both IP and device-id simultaneously — real, but disproportionate effort for what this endpoint is worth to an attacker (free translations, not financial data). |
| **Bypass difficulty** | Moderate — needs both proxy infrastructure and per-request identity rotation, not just one or the other. |
| **Implementation complexity** | Low — two `ratelimit.limit()` calls against two separate Upstash key namespaces (e.g. `ratelimit:translate:device` and `ratelimit:translate:ip`), both already have the plumbing in place. |
| **New dependency** | None. |
| **Works with anonymous app** | Yes. |
| **Impact on legitimate users** | Low, and softer than IP-only — the NAT-sharing caveat from option 6 is mitigated because the per-device bucket (which NAT-sharing doesn't affect) still lets legitimate users through even if their shared IP bucket is under pressure from someone else on the same network. |
| **Likely cost** | Negligible — roughly double the current Upstash call volume, still trivial at this app's scale. |
| **Appropriate for this app** | **Yes — cheap, no new dependency, no product trade-off, meaningfully better than the status quo.** Recommended as a baseline improvement regardless of what else is adopted. |

### 8. Per-request phrase/character/token limits

| | |
|---|---|
| **How it works** | Server-side validation rejecting any request where a single phrase's length, the number of phrases in a bulk request, or the number of target languages exceeds a fixed cap — currently absent (`translate-bulk.ts` only chunks internally into groups of 40 for its own Gemini calls; it never caps how large the incoming request itself can be). |
| **Protects against** | Cost amplification via oversized single requests — e.g. a 50,000-character "phrase" or an array of 10,000 phrases in one POST. This bounds the **maximum possible damage per request**, independent of how well any identity/rate-limit control holds up. |
| **Does NOT protect against** | High-volume abuse made of many small, in-bounds requests — this is a complement to rate limiting, not a substitute for it. |
| **Bypass difficulty** | Not bypassable by client behavior — it's an unconditional server-side check, not something a smarter client can talk its way around. |
| **Implementation complexity** | Very low — a handful of length/count checks returning `400` in the three route handlers. |
| **New dependency** | None. |
| **Works with anonymous app** | N/A — purely a backend control. |
| **Impact on legitimate users** | None, if limits are set comfortably above realistic phrase-book usage (see concrete numbers below). |
| **Likely cost** | None — pure risk reduction. |
| **Appropriate for this app** | **Yes, unconditionally** — this should be added regardless of any decision made about identity/auth. It's the cheapest, highest-value item on this list. |

### 9. Daily/monthly server-side spending limits (application-level)

| | |
|---|---|
| **How it works** | Track cumulative usage (request count, or an estimated token count) in Redis, incrementing per successful Gemini call; once a configured daily or monthly threshold is hit, short-circuit all three endpoints and return a clear "translation temporarily unavailable" response instead of calling Gemini at all. |
| **Protects against** | The worst-case scenario — a bug, a sustained attack, or unexpected viral usage silently running up an unknown, potentially large bill. Converts "unbounded exposure" into "a number you chose in advance." |
| **Does NOT protect against** | The abuse traffic itself — and once tripped, it degrades service for *legitimate* users too, since it's a blunt, app-wide cutoff rather than a targeted defense against whoever's actually abusing it. It's a backstop, not a first line of defense. |
| **Bypass difficulty** | Not applicable to an attacker (it's a hard ceiling they can't talk their way past) — but its side effect (denying real users once tripped) is a cost worth being aware of, and is the deliberate, acceptable trade-off versus an unbounded bill. |
| **Implementation complexity** | Low-moderate — one Redis counter, incremented after each successful Gemini call, checked before each new one. |
| **New dependency** | None — reuses the Upstash Redis client already present in `proxy/lib/redis.ts`. |
| **Works with anonymous app** | Yes — purely backend accounting. |
| **Impact on legitimate users** | None until the cap is actually hit; total service interruption for everyone once it is, until the window resets (or you raise it manually). |
| **Likely cost** | Negligible to implement and run. |
| **Appropriate for this app** | **Yes, recommended as a mandatory backstop** — precisely because none of the identity-layer options above (2, 3, 4, and even 5, in the limit) are unbreakable in principle; this is the control that makes the eventual bill knowable no matter what. |

### 10. Vercel / Gemini platform-level quota controls

| | |
|---|---|
| **How it works** | Two independent platform mechanisms, both configuration rather than code: **(a) Vercel Spend Management** (Pro plan) — set a team-wide spend threshold; once crossed, Vercel automatically pauses production deployments (visitors get a `503 DEPLOYMENT_PAUSED`) and sends real-time email/web/SMS alerts. **(b) Google Cloud/Gemini billing controls** — traditional Cloud Billing budget alerts (with optional Pub/Sub-triggered Cloud Function to auto-disable billing on the project before you'd even see the alert), *and*, as of April 1, 2026, Google now enforces **hard, non-disableable monthly spend caps per Gemini API billing tier** — once a billing account hits its tier's cap, every Gemini API request on that account is paused until the next billing cycle, automatically, with no configuration required from you. |
| **Protects against** | Exactly the same "unbounded bill" scenario as option 9, but enforced at the platform/billing level instead of in your own application code — a true last-resort circuit breaker that still works even if there's a bug in your own spend-tracking logic. |
| **Does NOT protect against** | The abuse traffic itself, and both mechanisms are blunt (all Vercel projects on the team pause; all Gemini calls on the billing account pause) — same fundamental trade-off as option 9. There is also a propagation delay: Vercel checks spend "every few minutes" (some overage possible before it trips), and Cloud Billing budget alerts have a documented lag between spend occurring and the alert firing. |
| **Bypass difficulty** | Not bypassable by an attacker — a genuine platform-level safety net. |
| **Implementation complexity** | Very low — dashboard configuration only (Vercel: *Settings → Spend Management*; Google Cloud: *Billing → Budgets & Alerts*). The April-2026 Gemini tier spend caps require no setup at all — they're automatic. |
| **New dependency** | None — pure account/platform configuration, no code. |
| **Works with anonymous app** | N/A. |
| **Impact on legitimate users** | Same all-or-nothing risk as option 9 if the cap is actually reached. |
| **Likely cost** | Free to configure. |
| **Appropriate for this app** | **Yes — turn this on today, independent of any other decision here.** It is the cheapest possible risk reduction available (pure configuration, zero engineering time) and should exist regardless of what's built on top of it. |

### 11. CORS restrictions

| | |
|---|---|
| **How it works** | Replace the current `Access-Control-Allow-Origin: *` with either no CORS header at all, or a tight allowlist, on all three endpoints. |
| **Protects against** | A specific, narrow scenario: a malicious *webpage*, visited in someone else's browser, that uses that visitor's browser to silently `fetch()` your endpoint and burn your quota. CORS is a browser-enforced restriction on cross-origin JavaScript, so it only stops abuse that originates as browser JS running on a third-party page. |
| **Does NOT protect against** | Effectively everything else. **This is the most important nuance to understand about CORS: it is not an access-control mechanism against a determined attacker.** curl, Postman, a Node script, a mobile app, or any server-to-server call is not a browser and is not subject to CORS at all — the restriction is enforced client-side by browsers, not by your server refusing the request. Nearly all realistic abuse tooling for a JSON API bypasses CORS trivially by simply not being a browser. |
| **Bypass difficulty** | Trivial for any non-browser client, which is most realistic abuse tooling. |
| **Implementation complexity** | Trivial — change one header value/condition per file. |
| **New dependency** | None. |
| **Works with anonymous app** | N/A. |
| **Impact on legitimate users** | None — Capacitor's Android WebView calls aren't subject to standard web-origin CORS enforcement the way a hosted website's visitors would be; even if it were, an allowlist including the app's actual WebView origin is sufficient. |
| **Likely cost** | None. |
| **Appropriate for this app** | Yes, tighten it — it costs nothing and closes off one specific, real (if minor) abuse path. But go in understanding it is a hygiene fix, not a security boundary, and shouldn't be counted toward "the" fix for H1. |

---

## RECOMMENDED ARCHITECTURE

Layered, cheapest-and-highest-value first, each layer independently useful even if another layer fails:

1. **Play Integrity (option 5)** as the core identity/genuineness signal — verify a Play Integrity verdict on the server before treating a request as coming from the real app. This is the only control on this list that can't be extracted from the APK, which is why it's the anchor rather than any embedded-secret scheme.
2. **Device + IP combined rate limiting (option 7)** as the throttle underneath it — cheap, no new dependency, catches abuse even from a device that somehow produces a valid-looking Integrity verdict but is simply calling too often.
3. **Hard per-request size caps (option 8)** — unconditional, regardless of identity, bounding worst-case damage per request.
4. **Server-side daily/monthly spend backstop (option 9)** plus **Vercel Spend Management and Google Cloud/Gemini billing caps (option 10)** — the "it doesn't matter what breaks upstream, the bill is still bounded" layer.
5. **CORS tightened (option 11)** — free hygiene, do it regardless.

Explicitly **not** recommended as meaningful controls on their own: options 2 and 4 (embedded secrets/signed requests) — see the callout section above. If you want a near-zero-effort stopgap *while* Play Integrity is being scoped/approved, options 7 + 8 + 9 + 10 together (none of which need a new dependency or your sign-off on anything beyond this report) already close the majority of the realistic exposure — Play Integrity is the piece that turns "harder to abuse" into "requires real reverse-engineering effort to abuse," but it's also the one piece that's a genuinely new dependency and a bigger lift, so it's reasonable to sequence it second.

## REQUIRED SERVER-SIDE LIMITS

Concrete starting numbers, chosen against the app's actual observed usage pattern (short travel phrases, client already chunks bulk-translate requests into groups of 20 — see `PhraseBookContext.tsx`'s `TRANSLATE_CHUNK_SIZE`):

| Limit | Recommended value | Rationale |
|---|---|---|
| Phrase length (`english`, per-language text) | 300 characters | Generously above any realistic travel phrase or short sentence; rejects paragraph-scale abuse payloads. |
| Phrases per bulk request (`translate-bulk`) | 50 | The client itself only ever sends 20 at a time; 50 gives headroom without allowing a raw HTTP caller to submit thousands in one call. |
| Target languages per request (`translate`) | 25 | Comfortably above the number of languages a real user is likely to track at once; the app currently ships ~85 possible language options total, so this still allows adding to most/all of them if genuinely needed, just not in one unbounded array. |
| Requests per IP | 150 / hour | Roughly 5x the per-device limit, to accommodate several genuine devices sharing one carrier-grade NAT IP (see option 6's caveat) without being effectively unlimited. |
| Requests per device/session | 30 / hour for `translate` and `translate-alternatives` (unchanged); **5–10 / hour for `translate-bulk`** specifically | Adding a whole new language (which triggers bulk-translate) is a rare, deliberate user action — a real user does this a handful of times ever, not repeatedly per hour. A tighter bulk-specific limit meaningfully caps the single most expensive endpoint without affecting normal usage. |
| Retry behavior (client) | No automatic retry on `429`; at most **one** retry with backoff (e.g. 2s) on transient `5xx`/timeout; hard cap total attempt time around 20s | Prevents a client-side retry loop from amplifying load during an incident, and ties into the "add request timeouts" recommendation already logged as L2 in the risk summary. |

These are starting points, not derived from hard data — they're deliberately generous relative to observed legitimate usage so they don't need frequent tuning, but they should be revisited once real traffic volume is known post-launch.

## EMERGENCY COST CONTROL

If the endpoint is actively being abused, in order of speed/severity:

1. **Fastest, works regardless of any code**: revoke or rotate the `GEMINI_API_KEY` in Google AI Studio / Google Cloud Console. This kills every call immediately, from any source, with no deploy needed. This is the single fastest lever available and should be the documented first response to a suspected incident.
2. **Nearly as fast**: pause the Vercel project's production deployment manually (Vercel dashboard), or set the Spend Management threshold to a very low value to force an automatic pause. This stops the proxy from serving *any* traffic, not just translation abuse.
3. **Slightly slower but durable**: disable the Generative Language API (Gemini) itself, or the whole billing account, in Google Cloud Console — stronger than key rotation since it doesn't depend on the key being the only credential in play.
4. **Pre-configured, automatic, no action needed at incident time** (do this now, not during an incident): Google Cloud Billing budget alert with a Pub/Sub-triggered Cloud Function to auto-disable billing before a hard cap is hit, *and* rely on the April-2026 mandatory Gemini per-tier spend caps as an additional, already-enforced backstop that requires no setup. Also enable Vercel Spend Management with "pause production deployments" turned on (per option 10, this is now the default behavior when spend management is enabled).
5. **Cheapest to add and useful for a "soft" pause** (not yet implemented; would be part of the implementation plan below): a manual kill-switch environment variable (e.g. `TRANSLATION_DISABLED=true`) checked first in each of the three handlers, returning a `503` immediately without touching Gemini at all. Flipping an env var and redeploying is roughly a one-minute action; if paired with Vercel's Edge Config instead of a plain env var, it can be flipped without a redeploy at all, for a true instant switch.

Recommendation: set up items 1–4 today (all pure configuration, no code, no new dependency, nothing that needs approval) — this alone puts a real ceiling on worst-case exposure before any other work here begins.

## IMPLEMENTATION PLAN

Ordered smallest-to-largest, nothing implemented yet:

1. **CORS tightening** — all 3 route files (`proxy/api/translate.ts`, `translate-alternatives.ts`, `translate-bulk.ts`): replace `Access-Control-Allow-Origin: *` with no header or a tight allowlist. Pure config change, ~1 line each.
2. **Hard input-size validation** — same 3 files: add length/count checks (phrase length, array sizes, target-language count) using the numbers in the table above, returning `400` on violation. Pure additive validation, no dependency.
3. **IP rate-limit bucket alongside the existing device-id bucket** — `proxy/lib/redis.ts` (add a second `Ratelimit` instance or key namespace) + the 3 route files (call `.limit()` against both buckets). Reuses `@upstash/ratelimit`, already a dependency.
4. **Redis-backed daily/monthly spend counter with hard cutoff** — new small helper in `proxy/lib/redis.ts`, checked at the top of each handler; reuses the existing Upstash Redis client.
5. **Manual kill-switch env var** — one `if` check at the top of each handler.
6. **Platform configuration (no code)**: turn on Vercel Spend Management (pause-on-threshold), Google Cloud Billing budget alert (+ optional auto-disable Cloud Function). This can and should happen immediately, independent of any code change.
7. **(Larger, optional, needs your explicit approval — new dependency)** Google Play Integrity: Android-side integration (`com.google.android.play:integrity`) to fetch a token, a small addition to `MainActivity`/a new Capacitor call to retrieve it, plus a new server-side verification call in the proxy (needs a Google Cloud project link and a decryption key). This is meaningfully more work than 1–6 and is the one item that should be scoped as its own follow-up rather than bundled in with the cheap wins above.

Items 1–6 require no new dependencies and no product trade-offs, and could reasonably be treated as one bundled change. Item 7 is a separate, larger decision.

---

## Sources consulted for this report

- [Play Integrity API overview — Android Developers](https://developer.android.com/google/play/integrity/overview)
- [Make a standard API request — Play Integrity — Android Developers](https://developer.android.com/google/play/integrity/standard)
- [Vercel: Spend Management now pauses production deployments by default](https://vercel.com/changelog/spend-management-now-pauses-production-deployments-by-default)
- [Vercel Spend Management docs](https://vercel.com/docs/spend-management)
- [Vercel WAF rate limiting now generally available](https://vercel.com/changelog/vercel-waf-rate-limiting-now-generally-available)
- [Vercel WAF custom rules docs](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
- [Google Cloud Billing — Create, edit, or delete budgets and budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Google Cloud Billing — Disable billing usage with notifications](https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications)
- [Using Gemini API keys — Google AI for Developers](https://ai.google.dev/gemini-api/docs/api-key)
