# Aurora AI OS — Frontend

The real frontend implementation of the Phase 1–3 surfaces described in [`aurora-ai-os/docs`](../aurora-ai-os): Dashboard, Chat, Agents, Agent Console, Research, and Canvas.

This replaces the earlier single-file HTML prototype. Same visual design, but now real routes, real typed data, real component state, wired to a real backend — not a mockup of one.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS — matching [`docs/09-tech-stack.md`](../aurora-ai-os/docs/09-tech-stack.md).

## Running it locally

```bash
cp .env.local.example .env.local   # points at http://localhost:8000 by default
npm install
npm run dev       # http://localhost:3000
```

```bash
npm run typecheck # tsc --noEmit
npm run lint       # eslint .
npm run build       # production build — all routes statically generated
```

All three currently pass clean with zero errors, zero warnings, and `npm audit` reports zero vulnerabilities.

## Structure

```
app/
  layout.tsx           — root layout, fonts (next/font), global shell
  globals.css          — Tailwind entry + scrollbar/reduced-motion rules
  page.tsx              — Dashboard (/)
  login/page.tsx         — Login/register (/login)
  chat/page.tsx           — Chat (/chat)
  agents/page.tsx         — Agents grid (/agents)
  agents/[id]/page.tsx     — Agent Console, real dynamic route per agent
  research/page.tsx        — Research report (/research)
  canvas/page.tsx           — Multi-panel Canvas (/canvas)
components/
  layout/     — Sidebar, TopBar, AppShell (used by every route)
  chat/       — ChatThread, Composer, MessageBubble (real state, shared between Chat and Canvas)
  agents/     — AgentsContent, AgentConsoleContent, ConsoleTabs
  dashboard/  — DashboardContent
lib/
  types.ts     — shared type contracts, mirror docs/05-database-design.md
  api.ts       — the real API client — every wire/frontend type mapping lives here
  auth.ts      — token storage, login/register/logout
  format.ts    — relative time formatting
```

## What's real vs. placeholder

**Real, and fully wired to the backend in `../aurora-api`:** auth (`/login` — register or sign in, real JWT, attached to every request, redirect-to-login on 401, working sign-out), Chat (real conversations, real messages, real model replies once the backend has an API key configured), the Dashboard (real "Recent threads" with backend-derived titles, real "Pinned projects" seeded per account), Agents (real per-user agents, real run history, a real persisted approve/deny flow — refresh the page and a decision you made stays made), Research (a real query box hitting the same backend in research mode — no fabricated sources or sample data), Canvas (a real chat panel sharing the same `Composer`/`MessageBubble` components as the Chat page, next to a real document panel with autosave), and a **persistent usage meter** in the top bar (`components/layout/UsageMeter.tsx`) — a battery-style indicator showing real token balance, updating instantly after every message (via a custom `aurora:usage-changed` event) and polling every 15s as a backstop, so running out is never a surprise notification after the fact.

**Placeholder, by design:** nothing structural is left — every surface in the app is wired to a real endpoint. What's still limited is *capability*, not fakery: no live web search (Research is honest about this rather than inventing citations), the Document panel is plain text (no rich formatting, diagrams, or multi-document tabs yet), and token pricing is a placeholder figure, not tied to a real billing plan.

## Known environment note

`next/font/google` fetches font files from Google Fonts at build time. This needs outbound access to `fonts.googleapis.com` — if that's blocked (e.g. a locked-down CI runner), the fetch fails. This is a network-policy issue, not a code issue, and doesn't affect Vercel, GitHub Actions, or any normal developer machine.

## Deploying (Vercel)

1. Push this repo to GitHub (done).
2. On [vercel.com](https://vercel.com), Add New → Project → import the `aurora-web` repo. Vercel auto-detects Next.js — no config needed.
3. Before deploying, add one environment variable in Vercel's project settings: `NEXT_PUBLIC_API_URL` = your deployed backend URL (e.g. `https://aurora-api-xxxx.onrender.com`) — deploy the backend first if you haven't, so you have this URL.
4. Deploy. Vercel gives you a URL like `https://aurora-web-xxxx.vercel.app`.
5. **Go back to the backend's `ALLOWED_ORIGINS` environment variable** and add this Vercel URL — CORS will silently block every request from the deployed frontend until you do.

## Next steps

See [`docs/10-roadmap.md`](../aurora-ai-os/docs/10-roadmap.md). Every core surface is now real. The honest remaining gaps are capability, not architecture: connecting a real search provider so Research can cite genuine sources, and richer document features (formatting, diagrams, version history) for Canvas.
