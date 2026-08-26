# Morpheus frontend

Next.js 15 interface for the local Morpheus backend: upload documents, ask questions, see answers with verified `[n]` citations and a grounded flag. Talks only to the backend on `127.0.0.1:8000`; no analytics, no remote fonts, no API keys.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, expects the backend on 127.0.0.1:8000
```

`npm run build && npm run start` serves a production build, still against the local backend. `.env.example` lists the few variables that exist; none are required.

## Scripts

```bash
npm run lint
npx tsc --noEmit
npm run test:ci      # jest
npm run test:e2e     # Playwright; includes a test that fails if any request leaves localhost
```

`scripts/screenshot.mjs` captures the README image from a running stack.

## Layout

```
src/
  app/                layout (local Geist font, theme bootstrap), page, global styles
  components/
    AppShell/         three-pane shell, header, mobile drawers, start-up strip
    Chat/             ChatInterface, MessageList, ChatMessage (grounded chip, citations), Composer, mode badge
    Docs/             library sidebar with per-document delete and clear-all
    System/           Status, Sources (the last answer's verified citations), System tabs
    Documents/        uploader
    Settings/         theme, model picker (installed Ollama models), retrieval mode, deep toggle
    Onboarding/       quick start guide
  lib/
    api-client.ts     fetch + SSE client for the backend
    hooks/useLocalChat.ts   chat state over the SSE stream
    hooks/useSettings.ts    persisted settings; purges the pre-2.0 blob that held API keys
    hooks/useBackendHealth.ts
    types.ts          mirrors backend/app/models/chat.py
```

## Security headers

`next.config.js` sets a Content-Security-Policy whose `connect-src` is the local backend and nothing else, plus `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy. The bundle is checked in CI for font, analytics and CDN hosts.
