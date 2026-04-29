# AI Usage Dashboard — PLAN.md

Real-time multi-provider AI usage dashboard. Six providers, encrypted secrets, SSE realtime, sleek glassmorphism UI. Public OSS repo.

## Stack

- **Frontend:** Next.js 15 App Router + React 19 + TypeScript strict + Tailwind v4 + Framer Motion + TanStack Query + Zustand
- **Backend:** Next.js Route Handlers (Node runtime — better-sqlite3/sodium need it)
- **Realtime:** SSE `/api/stream` multiplexer; in-process EventEmitter bus
- **Secrets:** `better-sqlite3` + `libsodium-wrappers-sumo` sealed boxes; `MASTER_KEY` from env
- **Tests:** Vitest + Testing Library + Playwright + MSW
- **Lint/format:** Biome
- **Package manager:** pnpm
- **Cross-platform:** Windows Git Bash + macOS + Linux

Pinned versions: `next@15.1.x`, `react@19.0.x`, `typescript@5.7.x`, `tailwindcss@4.0.x`, `@tanstack/react-query@5.62.x`, `zustand@5.0.x`, `framer-motion@11.15.x`, `better-sqlite3@11.7.x`, `libsodium-wrappers-sumo@0.7.15`, `vitest@2.1.x`, `@playwright/test@1.49.x`, `msw@2.7.x`, `@biomejs/biome@1.9.x`.

---

## Repo Layout

```
ai-usage-dash/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # dashboard (server component shell)
│   ├── globals.css                     # Tailwind v4 @theme tokens
│   ├── providers.tsx                   # client tree (Query, Zustand)
│   ├── middleware.ts                   # first-run redirect, CSRF cookie
│   ├── setup/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # stepper host (?step=…)
│   │   └── steps/{select,keys,verify}.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── stream/route.ts             # SSE
│       ├── credentials/route.ts        # POST/DELETE
│       ├── credentials/[id]/verify/route.ts
│       ├── providers/route.ts
│       ├── snapshot/route.ts
│       └── health/route.ts
├── components/
│   ├── ui/                             # primitives
│   ├── Background/{GradientBackdrop,GridOverlay,Vignette}.tsx
│   ├── TopBar/{TopBar,AggregateMetric,MasterLiveIndicator}.tsx
│   ├── Card/{GlassCard,ProviderCard,CardHeader,CardFooter,ModelBreakdownTable,CardSkeleton,CardError}.tsx
│   ├── Grid/{DashboardGrid,EmptyState}.tsx
│   ├── ProviderPicker/{ProviderPickerBar,ProviderPill}.tsx
│   ├── QuotaRing/QuotaRing.tsx
│   ├── CountUp/{CountUp,Countdown}.tsx
│   ├── SetupWizard/{SetupWizard,StepProgress,StepProviderSelect,StepKeyEntry,StepReview,KeyHelpPanel}.tsx
│   └── Settings/{SettingsDrawer,KeyManager,PollingControl,ThemeToggle,DangerZone}.tsx
├── lib/
│   ├── providers/
│   │   ├── types.ts                    # ProviderAdapter, UsageSnapshot
│   │   ├── registry.ts                 # static array + lookup
│   │   ├── {claude,openai,cursor,opencode,gemini,copilot}.ts
│   │   └── _fixtures/                  # recorded responses
│   ├── crypto/{sealedBox,masterKey,csrf}.ts
│   ├── db/{client,migrate,credentials,snapshots}.ts
│   ├── realtime/{bus,sse,poller,cache}.ts
│   ├── store/{usage,ui}.ts             # Zustand
│   ├── config/{env,budgets}.ts
│   └── boot.ts                         # singleton bootstrap
├── tests/
│   ├── unit/{providers,crypto,realtime}/*.test.ts
│   ├── integration/{sse,credentials-flow}.test.ts
│   ├── e2e/{setup-wizard,dashboard}.spec.ts
│   ├── visual/cards.spec.ts
│   └── msw/handlers.ts
├── scripts/{generate-master-key,verify-cross-platform,bundle-analyze}.ts
├── .github/{workflows/{ci,release,codeql}.yml,ISSUE_TEMPLATE/,PULL_REQUEST_TEMPLATE.md,dependabot.yml}
├── public/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── next.config.ts, biome.json, vitest.config.ts, playwright.config.ts
├── tsconfig.json, package.json, pnpm-workspace.yaml (no), pnpm-lock.yaml
├── README.md, PLAN.md, SECURITY.md, ARCHITECTURE.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, LICENSE
```

---

## Provider Plugin Contract

```ts
// lib/providers/types.ts
export type ProviderId = 'claude' | 'openai' | 'cursor' | 'opencode' | 'gemini' | 'copilot';

export interface AuthField {
  key: string;
  label: string;
  type: 'apiKey' | 'oauth' | 'cookie' | 'serviceAccountJson' | 'orgSlug';
  secret: boolean;
  placeholder?: string;
  helpUrl?: string;
}

export interface UsageSnapshot {
  providerId: ProviderId;
  fetchedAt: string;                       // ISO 8601
  session: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    requests: number;
    costUsd: number;
  };
  quota?: {
    period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'cycle';
    limit: number;
    used: number;
    unit: 'tokens' | 'requests' | 'usd' | 'seats';
    resetsAt: string;                      // ISO 8601 — REQUIRED when quota present
  };
  modelBreakdown?: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    requests: number;
    costUsd: number;
  }>;
  raw?: unknown;
  errors?: string[];
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly iconSlug: string;
  readonly authFields: ReadonlyArray<AuthField>;
  readonly pollIntervalMs: number;
  readonly status: 'official' | 'unofficial';
  fetchUsage(creds: Record<string,string>, signal: AbortSignal): Promise<UsageSnapshot>;
  verify(creds: Record<string,string>, signal: AbortSignal): Promise<void>;
}
```

```ts
// lib/providers/registry.ts
import claude from './claude'; import openai from './openai'; import cursor from './cursor';
import opencode from './opencode'; import gemini from './gemini'; import copilot from './copilot';
const adapters = [claude, openai, cursor, opencode, gemini, copilot] as const;
export const registry: ReadonlyMap<ProviderId, ProviderAdapter> = new Map(adapters.map(a => [a.id, a]));
export const getAdapter = (id: ProviderId) => { const a = registry.get(id); if (!a) throw new Error(`unknown provider ${id}`); return a; };
export const listAdapters = () => Array.from(registry.values());
```

Adding provider 7 = drop file, add 1 import line + 1 array entry.

---

## Provider APIs (verified late 2025/early 2026)

### Claude (Anthropic) — official
- **Auth:** Admin key `sk-ant-admin01-…`, header `x-api-key`, `anthropic-version: 2023-06-01`
- **Usage:** `GET https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=…&bucket_width=1d&group_by[]=model`
- **Cost:** `GET https://api.anthropic.com/v1/organizations/cost_report?starting_at=…&bucket_width=1d&group_by[]=description`
- **Quota:** rate-limit headers from regular Messages API: `anthropic-ratelimit-tokens-{limit,remaining,reset}` (RFC 3339). Optional admin endpoint `GET /v1/organizations/rate_limits`.
- **Cost gotcha:** `amount` is **cents as decimal string**, divide by 100 for USD.
- **Poll:** 60s.

### OpenAI — official
- **Auth:** Admin key `sk-admin-…`, `Authorization: Bearer …`
- **Usage:** `GET https://api.openai.com/v1/organization/usage/completions?start_time=<unix-sec>&bucket_width=1d&group_by[]=model`
- **Cost:** `GET https://api.openai.com/v1/organization/costs?start_time=<unix-sec>&bucket_width=1d`
- **Quota:** project `hard_limit_usd` field (monthly cap, no daily reset). Also rate-limit headers `x-ratelimit-{limit,remaining,reset}-{requests,tokens}` on Messages calls (durations not timestamps).
- **Gotcha:** `/v1/usage` and `/dashboard/billing/credit_grants` removed. ChatGPT Plus/Pro consumer plan has NO public API. `input_cached_tokens` exists; no cache-write field.
- **Poll:** 60s.

### Cursor — official + unofficial fallback
- **Official (Team plan):** `POST https://api.cursor.com/teams/filtered-usage-events`, `POST /teams/daily-usage-data`, `POST /teams/spend`. Basic auth `-u API_KEY:`. Limit: 20 rpm. Poll 60s.
- **Unofficial (individual users, BEST-EFFORT):** `POST https://cursor.com/api/dashboard/get-current-period-usage` and `GET https://cursor.com/api/usage?user=…` with cookie `WorkosCursorSessionToken`. UA required. Poll 120s. Cookie ~30 day life.

### OpenCode — local SQLite, BEST-EFFORT
- **Path:** macOS/Linux `~/.local/share/opencode/opencode.db`; Windows `%APPDATA%\opencode\opencode.db`
- **Open:** read-only URI `file:…?mode=ro`
- **Schema:** `message` table cols `session_id, model, input, output, reasoning, cache_read, cache_write, cost, created_at` (epoch ms)
- **Quota:** none — disk read.
- **Poll:** 5s gated by file mtime.

### Gemini (Google) — official ceiling only, no consumed
- **Auth:** Service-account OAuth2 (scope `cloud-platform`)
- **Quotas:** `GET https://cloudquotas.googleapis.com/v1/projects/{projectId}/locations/global/services/generativelanguage.googleapis.com/quotaInfos` → `GenerateRequestsPerMinutePerProjectPerModel`, …PerDay…
- **Cost:** only via BigQuery billing export (out of scope v1)
- **Quota reset:** midnight Pacific
- **Gotcha:** AI Studio has no consumer-account usage endpoint. Surface ceiling only; mark as informational.
- **Poll:** 60s.

### GitHub Copilot — official, per-seat
- **Auth:** PAT scope `manage_billing:copilot` or `read:org`. Org admin required.
- **Billing:** `GET https://api.github.com/orgs/{org}/copilot/billing`
- **Metrics:** `GET /orgs/{org}/copilot/metrics/reports/organization-1-day?day=YYYY-MM-DD` returns `{download_links}`; fetch the pre-signed S3 JSON.gz blob (links expire ~15min).
- **Quota:** seats. `seat_breakdown.total` limit, `active_this_cycle` used, unit `seats`. Reset = next billing cycle (approximate 1st of month).
- **Cost:** Copilot doesn't expose USD; compute `seats × {Business: 19, Enterprise: 39}`.
- **Gotcha:** old `/copilot/usage` removed 2026-04-02; metrics reports replace it. Reports lag ~24h. Individual Copilot has no API.
- **Poll:** 300s (5min). Rate limit 5000/hr per token.

### Poll-interval matrix

| Provider | Endpoint | Limit | `pollIntervalMs` |
|---|---|---|---|
| Claude | `/v1/organizations/usage_report/messages` | ~50 rpm | 60_000 |
| OpenAI | `/v1/organization/usage/completions` | ~60 rpm | 60_000 |
| Cursor (admin) | `/teams/filtered-usage-events` | 20 rpm | 60_000 |
| Cursor (cookie) | `cursor.com/api/dashboard/...` | unknown | 120_000 |
| OpenCode | local SQLite | n/a | 5_000 |
| Gemini | `cloudquotas.googleapis.com/...` | 60 rpm | 60_000 |
| Copilot | `/orgs/{org}/copilot/metrics/...` | 5000/hr | 300_000 |

---

## Data Flow

```
┌────────────┐    EventSource     ┌─────────────────┐
│  Browser   │ ─────────────────► │  /api/stream    │
│  React     │ ◄─── SSE evts ──── │  (Node)         │
└────────────┘                    │  bus.subscribe  │
                                  └────────▲────────┘
                                           │ emit('snapshot', s)
                                  ┌────────┴────────┐
                                  │ poller.ts       │
                                  │ setInterval/adp │
                                  └────────┬────────┘
                                           │ adapter.fetchUsage(decryptedCreds)
                                           ▼
                                    Provider HTTPS
                                           │
                                  cache.set + db.upsert
```

In-mem `Map<ProviderId, UsageSnapshot>` mirrored to SQLite for restart durability. SSE clients on connect get current cache as initial frames. Poller is HMR-safe singleton via `globalThis.__aiUsagePoller`. Reentrancy guard per adapter; abort controller timeout `min(interval-500ms, 10s)`.

## SSE Protocol

```
event: snapshot
id: 1714400000123-claude
data: {"providerId":"claude","fetchedAt":"…","session":{…},"quota":{…}}

event: error
id: 1714400000456-openai
data: {"providerId":"openai","kind":"auth","message":"401"}

event: heartbeat
data: {"t":1714400005000}
```

- Heartbeat every 15s
- `Last-Event-ID` honored on reconnect; replay newer cached snapshots
- Backpressure: per-connection queue holds at most 1 snapshot per providerId (overwrite intermediate)
- Close at `maxDuration - 5s` (Vercel)

## Secrets Storage

```sql
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL UNIQUE,
  encrypted_blob BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  last_verified_at INTEGER,
  last_error TEXT
);
CREATE TABLE snapshots (
  provider_id TEXT PRIMARY KEY,
  fetched_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
```

Sealed-box flow: derive recipient X25519 keypair from `MASTER_KEY` via `crypto_kdf_derive_from_key` (subkey id 1). Encrypt with `crypto_box_seal`. Decrypt only inside `poller.runOnce()` immediately before `adapter.fetchUsage`. Plaintext credentials never leave that scope.

Master-key bootstrap: read `process.env.MASTER_KEY`. If absent and `NODE_ENV !== 'production'` and `.env.local` writable: generate 32 random bytes, base64, append to `.env.local`, log warning. In production: refuse boot.

CSRF: middleware sets `__Host-csrf` cookie (SameSite=Strict, Secure, HttpOnly=false). Mutating routes require `x-csrf-token` header equal to cookie. Constant-time compare.

## Setup Wizard

`middleware.ts` checks `db.credentials.count()`; redirects to `/setup?step=select` when zero. Cached in `globalThis` 5s. Stepper URL state `?step=select|keys|verify&providers=claude,openai`. Verify button → `POST /api/credentials/{id}/verify` → adapter dry-run with 10s timeout. Plaintext zeroed after encrypt.

## Deployment

- **Vercel:** SSE route `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=300`. SQLite ephemeral on Vercel — document Turso swap as future. One-click button.
- **Docker:** multi-stage `node:22-bookworm-slim`, `pnpm fetch` → `pnpm install --offline` → `pnpm build`, copy `.next/standalone`, `EXPOSE 3000`, `VOLUME /data`. `docker-compose.yml` ships full stack.
- **Bare Node:** `pnpm build && node .next/standalone/server.js`.

## UI — Design Tokens

```css
@theme {
  --color-bg-deep: #0a0e27;
  --color-bg-deeper: #050816;
  --color-bg-elevated: #0f1535;
  --color-surface-glass: rgba(255,255,255,0.05);
  --color-surface-glass-strong: rgba(255,255,255,0.08);
  --color-border-faint: rgba(255,255,255,0.10);
  --color-border-strong: rgba(255,255,255,0.18);
  --color-grid-line: rgba(99,179,237,0.08);
  --color-accent-cyan: #5eead4;
  --color-accent-violet: #a78bfa;
  --color-text-primary: #f5f7ff;
  --color-text-muted: #a3acc7;
  --color-text-faint: #6b7493;
  --color-status-ok: #34d399;
  --color-status-warn: #fbbf24;
  --color-status-error: #f87171;
  --color-status-stale: #f59e0b;
  --radius-2xl: 22px;
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, "SF Mono", monospace;
  --shadow-glow-cyan: 0 0 40px rgba(94,234,212,0.15);
  --shadow-glow-violet: 0 0 40px rgba(167,139,250,0.18);
  --shadow-lift: 0 12px 40px -8px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4);
  --ease-out-soft: cubic-bezier(0.22, 0.61, 0.36, 1);
}
```

## UI — Card anatomy

Card: `relative w-full rounded-2xl bg-surface-glass backdrop-blur-[20px] border border-border-faint p-5 shadow-inset-glass overflow-hidden` min-h 220px.

Top: 32px logo + name + status dot (cyan pulse fresh / amber stale / red error / shimmer loading).

Body grid `grid-cols-[1fr_auto] gap-5`:
- Left: stacked input/output progress bar (cyan/70 + violet/70), CountUp tabular-nums, mm:ss countdown
- Right: 96px QuotaRing (color thresholds: green <60%, amber 60-85%, red >85%, pulse >95%)

Footer: `$X.XX` cost + chevron. Expanded shows `ModelBreakdownTable` (AnimatePresence height/opacity 240ms).

Hover: `translateY(-4px)` 200ms, gradient cyan→violet border, `shadow-glow-cyan`.

## UI — Layout

Top bar fixed h-14 glass with: wordmark + AggregateMetric x3 (tokens today / spend today / active providers) + ProviderPickerBar pills + MasterLiveIndicator + settings gear + theme toggle.

Grid: `repeat(auto-fit, minmax(320px, 1fr))` gap 1.25rem; `Reorder.Group` axis="y" with `LayoutGroup` for spring reorder. Drag persists order to `localStorage:dashboard.cardOrder`.

ProviderPicker: top-bar pills (preferred over rail). Toggle visibility, persist `localStorage:dashboard.visibleProviders`.

Setup wizard: 720px GlassCard modal, 3 steps (select → keys → verify). Two-column on step 2 (form + KeyHelpPanel screenshots).

Settings drawer: 420px right slide-in, sections API Keys / Polling / Theme / Notifications / Danger Zone.

States: empty (CTA), loading (shimmer), error (red border + retry), stale (amber dot + age tooltip).

## UI — Motion (all behind `prefers-reduced-motion`)

| Animation | Duration | Easing |
|---|---|---|
| Card mount | 200ms | ease-out-soft |
| Card reorder | spring 320/30 | LayoutGroup |
| Card hover lift | 200ms | ease-out-soft |
| CountUp | 400ms | ease-out (rAF) |
| QuotaRing fill | 600ms | ease-in-out |
| Status pulse | 2s loop | ease-in-out |
| Grid parallax | rAF 60fps | linear (mouse) |
| Drawer slide | 280ms | ease-out-soft |

## A11y

- Tab order: top bar → grid → drawers
- Focus rings: `focus-visible:ring-2 focus-visible:ring-accent-cyan`
- `aria-live="polite"` per card, debounced 5s
- Status dot paired with icon shape + sr-only text (color never alone)
- QuotaRing `role="progressbar"`
- Keyboard reorder: `Ctrl+ArrowUp/Down`
- Contrast: text-primary 19.6:1, text-muted 7.1:1

## Testing Strategy

- **Unit (Vitest):** adapter parsing of recorded fixtures, sealedBox round-trip, poller reentrancy with fake timers, cache hydration
- **Integration (Vitest + MSW):** poller running, MSW intercepts outbound provider URLs, SSE client asserts event sequence
- **E2E (Playwright):** setup wizard happy path, dashboard renders cards, countdown ticks
- **Visual:** Playwright `toHaveScreenshot()` with frozen Date and motion off
- **CI matrix:** Node 20/22 × {ubuntu-latest, windows-latest, macos-latest}

## Performance Budget

- Lighthouse ≥ 95 on `/` and `/setup`
- JS first-load ≤ 200KB gzipped
- SSR shell renders skeleton with last-known snapshots
- `framer-motion/mini` where possible
- `next/font` self-hosted, no font network calls

## Threat Model (→ SECURITY.md)

In scope: provider-key theft via egress (server-only), XSS exfiltrating snapshots (CSP, no inline scripts, no `dangerouslySetInnerHTML`), CSRF on credential mutations (double-submit + SameSite=Strict), timing attacks on CSRF compare (constant-time).

Out of scope: adversary with local read access to `app.db` + `.env.local` (single-user local trust model), libsodium side-channel, transitive supply chain (mitigated by Dependabot + `pnpm audit` in CI).

## Public Repo Polish

- README with deploy buttons (Vercel, Railway, Docker), animated GIF, badges
- `docker-compose up` runs full stack
- CONTRIBUTING.md, CODE_OF_CONDUCT.md (Covenant 2.1), MIT LICENSE
- Issue templates (bug, feature, new-provider), PR template
- `.github/workflows/{ci,release,codeql}.yml`, Dependabot weekly
- SECURITY.md vuln-report contact
- `.editorconfig` + Biome config

## Acceptance Criteria

- 6 providers wired with fixtures + tests
- Add 7th provider in <50 LOC + 1 test file
- Cold load <1.5s; Lighthouse ≥95
- Keys encrypted at rest, verified by test
- SSE end-to-end ≤6s
- Daily quota + reset countdown ticking on Claude + OpenAI cards
- All states (hover/empty/error/stale/loading) designed and tested
- CI matrix green
- `pnpm dev` works on Windows Git Bash
- README 60s quickstart + screenshot

## Hard Rules

- No `any` in TS; strict mode on
- No mocks for our own code in integration tests; only HTTP boundary via MSW
- No commented-out code, no untracked TODOs
- Conventional Commits
- Do NOT push to remote without explicit user OK
