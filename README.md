# HookPulse

Webhook observability dashboard with a Vercel Node.js API for receiving, verifying, storing, and optionally forwarding webhook callbacks.

## Features

- React + TypeScript dashboard with payload stream, JSON inspection, event replay and test-payload generator.
- Serverless endpoints: `GET /api/health`, `GET/POST/DELETE /api/events`, and `POST /api/webhooks/{github|mpesa|agent}`.
- HMAC-SHA256 verification for GitHub (`x-hub-signature-256`) and configurable shared-signature providers (`x-hookpulse-signature`).
- Optional server-side outbound forwarding to a configured HTTPS destination with an eight-second timeout.
- Sensitive request headers (authorization, cookies, signatures, tokens) are excluded from event logs.
- Upstash Redis persistence when configured; in-memory fallback for local development only.

## Local development

```bash
npm install
cp .env.example .env.local
npx vercel dev
```

Use the Vercel development runtime so the `/api` serverless functions are available alongside Vite.

## Deploy to Vercel

1. Import this repository into Vercel (framework preset: Vite; build: `npm run build`; output: `dist`).
2. In Vercel Storage, create an Upstash Redis database and connect it to this project, or set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` manually.
3. Set a long, random `DASHBOARD_API_TOKEN` in Vercel Project Settings → Environment Variables. Enter the same value in the dashboard's API token field to load or manage event history. Then add provider secrets from `.env.example` and redeploy.
4. Optionally set `FORWARD_WEBHOOK_URL` to your own HTTPS callback receiver and `FORWARD_WEBHOOK_TOKEN` to its bearer token. The relay forwards the original JSON body; the target URL is never exposed to the browser.
5. Configure provider callback URLs:
   - GitHub: `https://YOUR_DOMAIN/api/webhooks/github`. Set the same webhook secret in GitHub and Vercel.
   - M-Pesa Daraja: `https://YOUR_DOMAIN/api/webhooks/mpesa`. Daraja callback payloads do not use GitHub's signature header; use an upstream gateway that adds `x-hookpulse-signature` if HMAC authentication is required. Otherwise apply gateway/network controls and understand that callbacks are recorded as unverified.
   - Agent: `https://YOUR_DOMAIN/api/webhooks/agent`.
6. Confirm the service at `https://YOUR_DOMAIN/api/health`.

## Security and operational notes\n\n- Dashboard API access is bearer-token protected. On Vercel, the event API fails closed with HTTP 503 until `DASHBOARD_API_TOKEN` is configured; local development can run without it.

- Never put signing secrets in Vite variables or browser code. Keep them in server-side Vercel environment variables.
- GitHub HMAC verification uses the exact raw request bytes. The API rejects missing or invalid signatures whenever a matching secret is configured.
- Without Upstash, event storage is ephemeral and may disappear between serverless invocations. Configure Redis for durable shared event history.
- Dashboard event listing, simulator writes, and clearing require `DASHBOARD_API_TOKEN` in production. The token is entered in the dashboard and held only in component memory; do not share it. Keep the simulator endpoint restricted to trusted dashboard users.
- The optional forwarder posts to a URL controlled only by the deployment environment, not by incoming request data. Configure only a destination you trust.
- HookPulse is a webhook receiver and outbound HTTP relay, not a public TCP tunnel to a developer laptop. For local development, expose a local receiver through a trusted tunnel and set that HTTPS address as `FORWARD_WEBHOOK_URL`.
