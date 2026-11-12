# HookPulse

Sovereign webhook inspector, local tunnel relay simulator, and API resilience debugger.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

HookPulse is a frontend demonstration. Webhook events, tunnel status, retries, and signature checks are simulated in the browser; connect a trusted backend before using real payment or production webhook traffic.

## Deploy to Vercel

Import this repository into Vercel. Use the default Vite settings: build command `npm run build`, output directory `dist`, install command `npm install`.