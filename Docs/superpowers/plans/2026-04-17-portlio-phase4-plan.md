# Portlio Phase 4 — Implementation Plan
# AI Pipeline Runner (Multi-Provider) & Briefing Viewer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admin users to trigger an AI-powered portfolio analysis pipeline for a selected revenue month. Users choose their preferred AI provider and model (OpenAI GPT-4o/GPT-4o-mini, Anthropic Claude 3.5/Haiku, or Google Gemini 1.5 Pro/Flash). The pipeline reads aggregated data from the analytics views, builds a structured prompt, calls the selected provider, and stores the resulting briefing in `monthly_portfolio_briefings`. A briefing viewer page renders the saved text alongside KPI context. The pipeline is capped at **10 properties** per run to control cost.

**Architecture:**
- `POST /api/pipeline/run` — authenticated, admin-only route. Request body includes `revenue_month` and `model` (e.g. `"claude-3-5-sonnet-20241022"`). Provider is inferred from the model name prefix.
- `lib/pipeline/providers/` — provider adapter pattern. Each adapter implements a common `AIProvider` interface. The route calls `getProvider(model)` which returns the correct adapter.
- Per-provider API keys stored in `companies` table (all AES-256-GCM encrypted): `openai_api_key`, `anthropic_api_key`, `google_api_key`. A new DB migration adds the two new columns.
- Onboarding Step 2 (currently "OpenAI Key") is updated to a multi-tab **AI Keys** step where users can add keys for any/all providers.
- `prompt_configs.model` (already exists) stores the company's preferred model. Default: `gpt-4o`.
- `data_hash` (SHA-256 of pipeline input) guards against redundant expensive re-runs.
- `pipeline_runs` records every attempt with provider, model, status, and error.

**Tech Stack:** Next.js 14 App Router, TypeScript, `openai` SDK, `@anthropic-ai/sdk`, `@google/generative-ai`, Supabase, Tailwind CSS, shadcn/ui, `crypto` (Node built-in).

**Reference:**
- `Docs/superpowers/specs/2026-04-14-portlio-phase1-design.md` (§3 — `prompt_configs`, `pipeline_runs`, `monthly_portfolio_briefings`)
- `supabase/migrations/001_app_schema.sql` — `companies`, `prompt_configs`, `pipeline_runs`
- `supabase/migrations/002_hosted_reservations.sql` — `monthly_portfolio_briefings`
- `lib/encryption.ts` — AES-256-GCM encrypt/decrypt
- `lib/getDataClient.ts` — data routing (hosted vs BYOS)

---

## Supported Models

| Provider | Model ID | Display Name |
|----------|----------|--------------|
| OpenAI | `gpt-4o` | GPT-4o |
| OpenAI | `gpt-4o-mini` | GPT-4o mini |
| Anthropic | `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet |
| Anthropic | `claude-3-haiku-20240307` | Claude 3 Haiku |
| Google | `gemini-2.5-flash` | Gemini 2.5 Flash |
| Google | `gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite |
| Google | `gemini-3-flash-preview` | Gemini 3 Flash |
| Google | `gemini-3.1-flash-lite-preview` | Gemini 3.1 Flash-Lite |

Provider is inferred from the model ID prefix:
- Starts with `gpt-` or `o1` → `openai`
- Starts with `claude-` → `anthropic`
- Starts with `gemini-` → `google`

> **Note on Google preview models:** `gemini-3-flash-preview` and `gemini-3.1-flash-lite-preview` are currently in preview. They are available via the `@google/generative-ai` SDK but may require allowlisting. Label them clearly as "Preview" in the UI dropdown. Always check the [Gemini API docs](https://ai.google.dev/gemini-api/docs/models) for the latest stable model IDs before release.

---

## Folder Structure (new & modified files)

```
app/
├── api/
│   └── pipeline/
│       └── run/
│           ├── route.ts                           ← NEW: POST — multi-provider pipeline
│           └── __tests__/route.test.ts            ← NEW: route tests (mocked providers)
└── (protected)/
    └── dashboard/
        └── briefings/
            └── [month]/
                └── page.tsx                       ← NEW: briefing viewer

components/
├── onboarding/
│   └── AIKeysStep.tsx                             ← MODIFY: was OpenAIKeyStep; now multi-tab
└── pipeline/
    ├── RunPipelineButton.tsx                      ← NEW: trigger + model selector dropdown
    ├── BriefingCard.tsx                           ← NEW: renders briefing text
    ├── PipelineStatusBadge.tsx                    ← NEW: status pill
    └── __tests__/
        ├── RunPipelineButton.test.tsx
        └── BriefingCard.test.tsx

lib/
└── pipeline/
    ├── types.ts                                   ← NEW: shared types
    ├── computeHash.ts                             ← NEW: SHA-256 of pipeline input
    ├── buildPrompt.ts                             ← NEW: prompt assembly
    ├── getProvider.ts                             ← NEW: infer provider from model ID
    ├── providers/
    │   ├── interface.ts                           ← NEW: AIProvider interface
    │   ├── openai.ts                              ← NEW: OpenAI adapter
    │   ├── anthropic.ts                           ← NEW: Anthropic adapter
    │   └── google.ts                              ← NEW: Google Gemini adapter
    └── __tests__/
        ├── computeHash.test.ts
        ├── buildPrompt.test.ts
        └── getProvider.test.ts

supabase/
└── migrations/
    └── 005_multi_provider_keys.sql                ← NEW: add anthropic/google key columns + pipeline_runs.model
```

Files modified (not created):
- `components/onboarding/AIKeysStep.tsx` (was `OpenAIKeyStep.tsx`) — multi-tab key entry: OpenAI | Claude | Gemini.
- `app/(protected)/dashboard/page.tsx` — add briefing panel with model selector.
- `components/layout/Sidebar.tsx` — add "Briefings" nav item.
- `tasks.md` — check off Tasks 29–35.

---

## Design Notes (read before starting)

### Provider Adapter Interface

```ts
// lib/pipeline/providers/interface.ts
export interface AIProvider {
  chat(params: {
    system: string;
    user: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }): Promise<{
    text: string;
    promptTokens: number;
    completionTokens: number;
  }>;
}
```

All 3 adapters implement this interface. The route only calls `provider.chat(...)` — never touches SDK specifics.

### API Key resolution

```
user selects model → infer provider → decrypt matching key from companies row
openai_api_key    → OpenAI adapter
anthropic_api_key → Anthropic adapter
google_api_key    → Google adapter
```

If the required key is not configured for the company, return `402 Payment Required` with body `{ "error": "API key not configured", "provider": "anthropic" }`.

### Model selector in UI

`RunPipelineButton` shows a split button: [Generate Briefing ▼] with a dropdown of all supported models. The currently saved `prompt_configs.model` is pre-selected. Selecting a different model persists the choice to `prompt_configs` before triggering the run (via `PATCH /api/pipeline/config`).

### `prompt_configs` default model

Default remains `gpt-4o`. Companies without a saved config get this default. The model stored in `prompt_configs` is the company's last-used/preferred model.

### `pipeline_runs` — add `model` column

New migration adds `model text` column so each run records which model was used. This feeds the briefing viewer ("Generated with Claude 3.5 Sonnet").

### `monthly_portfolio_briefings` — add `model` column (stretch)

Also record which model generated the briefing in the viewer. Same migration.

### Onboarding Step 2: AI Keys

Three tabs: **OpenAI** | **Claude** | **Gemini**. Each tab has:
- A text input for the API key (masked).
- A "Validate" button that pings a lightweight test request.
- A "Save" button.

At least one provider key must be saved before the step allows progression. The step title changes from "OpenAI Key" to "AI Provider Keys".

---

## Task 29: DB Migration — Multi-Provider Key Columns

**Files:**
- Create: `supabase/migrations/005_multi_provider_keys.sql`

- [ ] **Step 1: Write and apply migration**

```sql
-- Portlio Phase 4 — Multi-provider AI key columns
-- Add Anthropic and Google key columns to companies.
-- Add model column to pipeline_runs and monthly_portfolio_briefings.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS anthropic_api_key text,
  ADD COLUMN IF NOT EXISTS google_api_key    text;

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS model text;

ALTER TABLE monthly_portfolio_briefings
  ADD COLUMN IF NOT EXISTS model text;
```

- [ ] **Step 2: Apply via MCP or Supabase SQL Editor**

- [ ] **Step 3: Commit**
```
git add supabase/migrations/005_multi_provider_keys.sql
git commit -m "chore(db): add multi-provider key columns + model to pipeline/briefings"
```

---

## Task 30: Pipeline Library — Types, `computeHash`, `getProvider`

**Files:**
- Create: `lib/pipeline/types.ts`
- Create: `lib/pipeline/computeHash.ts`
- Create: `lib/pipeline/getProvider.ts`
- Create: `lib/pipeline/providers/interface.ts`
- Create: `lib/pipeline/__tests__/computeHash.test.ts`
- Create: `lib/pipeline/__tests__/getProvider.test.ts`

### Task 30a: Types

- [ ] **Step 1: Create `lib/pipeline/types.ts`**

```ts
export type AIProviderName = 'openai' | 'anthropic' | 'google';

export const SUPPORTED_MODELS: Record<string, { provider: AIProviderName; displayName: string; preview?: boolean }> = {
  // OpenAI
  'gpt-4o':                          { provider: 'openai',    displayName: 'GPT-4o' },
  'gpt-4o-mini':                     { provider: 'openai',    displayName: 'GPT-4o mini' },
  // Anthropic
  'claude-3-5-sonnet-20241022':      { provider: 'anthropic', displayName: 'Claude 3.5 Sonnet' },
  'claude-3-haiku-20240307':         { provider: 'anthropic', displayName: 'Claude 3 Haiku' },
  // Google Gemini — 2.5 stable + 3.x preview
  'gemini-2.5-flash':                { provider: 'google',    displayName: 'Gemini 2.5 Flash' },
  'gemini-2.5-flash-lite':           { provider: 'google',    displayName: 'Gemini 2.5 Flash-Lite' },
  'gemini-3-flash-preview':          { provider: 'google',    displayName: 'Gemini 3 Flash',       preview: true },
  'gemini-3.1-flash-lite-preview':   { provider: 'google',    displayName: 'Gemini 3.1 Flash-Lite', preview: true },
};

export type PropertySummaryRow = {
  listing_id: string;
  listing_nickname: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
};

export type PipelineInput = {
  company_id: string;
  revenue_month: string;             // 'YYYY-MM-DD'
  property_count: number;            // total, before 10-property cap
  total_revenue: number;
  portfolio_adr: number;
  total_nights: number;
  properties: PropertySummaryRow[];  // up to 10, sorted by revenue desc
};

export type PipelineResult = {
  briefing_text: string;
  data_hash: string;
  model: string;
  provider: AIProviderName;
  prompt_tokens: number;
  completion_tokens: number;
};

export type PipelineRunStatus = 'pending' | 'running' | 'complete' | 'failed';
```

### Task 30b: `computeHash`

- [ ] **Step 1: Write failing tests** (`lib/pipeline/__tests__/computeHash.test.ts`)

```ts
import { computeHash } from '../computeHash';
import type { PipelineInput } from '../types';

const INPUT: PipelineInput = {
  company_id: 'abc',
  revenue_month: '2026-03-01',
  property_count: 3,
  total_revenue: 5000,
  portfolio_adr: 250,
  total_nights: 20,
  properties: [],
};

describe('computeHash', () => {
  it('returns a 64-char hex string', () => {
    expect(computeHash(INPUT)).toHaveLength(64);
    expect(computeHash(INPUT)).toMatch(/^[0-9a-f]+$/);
  });
  it('is deterministic', () => {
    expect(computeHash(INPUT)).toBe(computeHash({ ...INPUT }));
  });
  it('changes when data changes', () => {
    expect(computeHash(INPUT)).not.toBe(computeHash({ ...INPUT, total_revenue: 9999 }));
  });
});
```

- [ ] **Step 2: Implement `lib/pipeline/computeHash.ts`**

```ts
import { createHash } from 'crypto';
import type { PipelineInput } from './types';

export function computeHash(input: PipelineInput): string {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
```

### Task 30c: `getProvider`

- [ ] **Step 1: Write failing tests** (`lib/pipeline/__tests__/getProvider.test.ts`)

```ts
import { inferProvider } from '../getProvider';

describe('inferProvider', () => {
  it('maps gpt- models to openai', () => expect(inferProvider('gpt-4o')).toBe('openai'));
  it('maps claude- models to anthropic', () => expect(inferProvider('claude-3-5-sonnet-20241022')).toBe('anthropic'));
  it('maps gemini- models to google', () => expect(inferProvider('gemini-1.5-pro')).toBe('google'));
  it('throws on unknown model', () => expect(() => inferProvider('llama-3')).toThrow());
});
```

- [ ] **Step 2: Implement `lib/pipeline/getProvider.ts`**

```ts
import type { AIProviderName } from './types';
import { SUPPORTED_MODELS } from './types';

export function inferProvider(model: string): AIProviderName {
  const entry = SUPPORTED_MODELS[model];
  if (!entry) throw new Error(`Unsupported model: ${model}`);
  return entry.provider;
}

export function getApiKeyForProvider(
  provider: AIProviderName,
  company: { openai_api_key?: string | null; anthropic_api_key?: string | null; google_api_key?: string | null }
): string | null {
  const map: Record<AIProviderName, string | null | undefined> = {
    openai:    company.openai_api_key,
    anthropic: company.anthropic_api_key,
    google:    company.google_api_key,
  };
  return map[provider] ?? null;
}
```

- [ ] **Step 3: Run tests — verify pass**

- [ ] **Step 4: Commit**
```
git add lib/pipeline/types.ts lib/pipeline/computeHash.ts lib/pipeline/getProvider.ts lib/pipeline/__tests__/
git commit -m "feat(pipeline): types, computeHash, getProvider"
```

---

## Task 31: Provider Adapters

**Files:**
- Create: `lib/pipeline/providers/interface.ts`
- Create: `lib/pipeline/providers/openai.ts`
- Create: `lib/pipeline/providers/anthropic.ts`
- Create: `lib/pipeline/providers/google.ts`

No unit tests for adapters (they wrap external SDKs). Integration is tested via mocked provider in the route test.

- [ ] **Step 1: Install provider SDKs**
```
npm install openai @anthropic-ai/sdk @google/generative-ai
```

- [ ] **Step 2: Create `lib/pipeline/providers/interface.ts`**

```ts
export interface AIProvider {
  chat(params: {
    system: string;
    user: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }): Promise<{
    text: string;
    promptTokens: number;
    completionTokens: number;
  }>;
}
```

- [ ] **Step 3: Create `lib/pipeline/providers/openai.ts`**

```ts
import OpenAI from 'openai';
import type { AIProvider } from './interface';

const TIMEOUT_MS = 30_000;

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }) {
    const client = new OpenAI({ apiKey: this.apiKey, timeout: TIMEOUT_MS });
    const res = await client.chat.completions.create({
      model, temperature, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned an empty response');
    return {
      text: text.trim(),
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    };
  }
}
```

- [ ] **Step 4: Create `lib/pipeline/providers/anthropic.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './interface';

const TIMEOUT_MS = 30_000;

export class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }) {
    const client = new Anthropic({ apiKey: this.apiKey, timeout: TIMEOUT_MS });
    const res = await client.messages.create({
      model, temperature, max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const block = res.content[0];
    if (!block || block.type !== 'text') throw new Error('Anthropic returned an empty response');
    return {
      text: block.text.trim(),
      promptTokens: res.usage.input_tokens,
      completionTokens: res.usage.output_tokens,
    };
  }
}
```

- [ ] **Step 5: Create `lib/pipeline/providers/google.ts`**

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './interface';

export class GoogleProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }) {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    });
    const result = await genModel.generateContent(user);
    const text = result.response.text();
    if (!text) throw new Error('Gemini returned an empty response');
    // Gemini SDK does not expose token counts in all versions; default to 0
    const usage = result.response.usageMetadata;
    return {
      text: text.trim(),
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}
```

- [ ] **Step 6: Create factory `lib/pipeline/providers/index.ts`**

```ts
import type { AIProvider } from './interface';
import type { AIProviderName } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';

export function createProvider(provider: AIProviderName, apiKey: string): AIProvider {
  switch (provider) {
    case 'openai':    return new OpenAIProvider(apiKey);
    case 'anthropic': return new AnthropicProvider(apiKey);
    case 'google':    return new GoogleProvider(apiKey);
  }
}
```

- [ ] **Step 7: Commit**
```
git add lib/pipeline/providers/
git commit -m "feat(pipeline): OpenAI, Anthropic, and Google provider adapters"
```

---

## Task 32: `buildPrompt`

**Files:**
- Create: `lib/pipeline/buildPrompt.ts`
- Create: `lib/pipeline/__tests__/buildPrompt.test.ts`

(Identical to original plan — prompt building is provider-agnostic.)

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Implement `buildPrompt.ts`** (see design notes above for template)
- [ ] **Step 3: Run tests — verify pass**
- [ ] **Step 4: Commit**
```
git add lib/pipeline/buildPrompt.ts lib/pipeline/__tests__/buildPrompt.test.ts
git commit -m "feat(pipeline): buildPrompt"
```

---

## Task 33: Pipeline API Route

**Files:**
- Create: `app/api/pipeline/run/route.ts`
- Create: `app/api/pipeline/config/route.ts`  ← PATCH to save preferred model
- Create: `app/api/pipeline/run/__tests__/route.test.ts`

### Route contract — `POST /api/pipeline/run`

**Request:**
```json
{ "revenue_month": "2026-03-01", "model": "claude-3-5-sonnet-20241022" }
```

**Responses:**
- `200` — `{ briefing_text, revenue_month, generated_at, data_hash, model, provider }`
- `400` — missing/invalid `revenue_month` or unsupported `model`
- `402` — provider API key not configured for this company, `{ error, provider }`
- `403` — user is not admin
- `404` — no data for requested month
- `409` — briefing up to date (hash unchanged), `{ upToDate: true }`
- `504` — provider timeout

### Route logic

```
1. Auth → get user id, verify role='admin' → 403 if not
2. Fetch company (id, mode, all 3 encrypted key columns)
3. Validate model is in SUPPORTED_MODELS → 400 if not
4. inferProvider(model) → providerName
5. getApiKeyForProvider(providerName, company) → encrypted key or null → 402 if null
6. decrypt(encryptedKey)
7. Fetch prompt_configs for company (or use defaults + passed model)
8. getDataClient(company) → data client
9. Query monthly_portfolio_summary for revenue_month → 404 if empty
10. Query final_reporting_gold for revenue_month, top 10 by revenue
11. Build PipelineInput, computeHash
12. Check monthly_portfolio_briefings — hash match → 409
13. INSERT pipeline_runs { status='running', model }
14. buildPrompt(input, systemPrompt, userTemplate)
15. createProvider(providerName, decryptedKey).chat({ system, user, model, temperature, maxTokens })
16. Upsert monthly_portfolio_briefings { portfolio_summary, data_hash, model }
17. UPDATE pipeline_runs { status='complete', completed_at }
18. Return 200
On error after step 13: UPDATE pipeline_runs { status='failed', error_message }
```

### Route contract — `PATCH /api/pipeline/config`

```json
{ "model": "gemini-1.5-pro" }
```

Upserts the company's `prompt_configs` row with the new model. Used by the model selector dropdown to persist preference.

- [ ] **Step 1: Write route tests** (mock `createProvider`, mock Supabase)

Key cases:
- 402 when provider key missing
- 403 for non-admin
- 404 for missing month data
- 409 for matching hash
- 200 with correct provider routing
- `pipeline_runs` status tracked correctly

- [ ] **Step 2: Implement `route.ts` for `POST /api/pipeline/run`**
- [ ] **Step 3: Implement `route.ts` for `PATCH /api/pipeline/config`**
- [ ] **Step 4: Run tests — verify pass**
- [ ] **Step 5: Commit**
```
git add app/api/pipeline/
git commit -m "feat(pipeline): run route + config PATCH route"
```

---

## Task 34: Update Onboarding — AI Keys Step

**Files:**
- Modify: `components/onboarding/AIKeysStep.tsx` (was `OpenAIKeyStep.tsx`)

Changed from a single OpenAI key input to a **3-tab provider key configurator**.

### Design

```
┌─────────────────────────────────────────────────┐
│ AI Provider Keys                                 │
│                                                  │
│ [OpenAI]  [Claude]  [Gemini]                     │
│                                                  │
│ OpenAI API Key                                   │
│ ┌──────────────────────────────────────────┐    │
│ │ sk-...                               👁  │    │
│ └──────────────────────────────────────────┘    │
│ [Validate]  [Save]   ✓ Saved                    │
│                                                  │
│ At least one provider key required to continue.  │
│                            [Continue →]          │
└─────────────────────────────────────────────────┘
```

Each tab independently validates and saves. "Continue" is enabled once at least one key is saved.

### Validation

Each provider tab sends a lightweight test request:
- OpenAI: `GET /api/ai-keys/validate?provider=openai` — calls `openai.models.list()` (cheap, no tokens)
- Anthropic: calls `anthropic.models.list()`
- Google: calls `genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).countTokens('')`

Create `app/api/ai-keys/validate/route.ts`:
```
GET /api/ai-keys/validate?provider=openai&key=sk-...
→ 200 { valid: true } | 401 { valid: false, message }
```
Key is passed as a query param (not saved yet). Session auth still required.

- [ ] **Step 1: Create `app/api/ai-keys/validate/route.ts`** (GET, validates any provider key)
- [ ] **Step 2: Update `AIKeysStep.tsx`** with tabs, masked inputs, validate+save flow
- [ ] **Step 3: Update `OnboardingWizard`** to pass all 3 key save calls through to the step  
- [ ] **Step 4: Test manually** — validate each provider, confirm "Continue" unlocks after first save
- [ ] **Step 5: Commit**
```
git add components/onboarding/AIKeysStep.tsx app/api/ai-keys/
git commit -m "feat(onboarding): multi-provider AI key step"
```

---

## Task 35: Run Pipeline UI & Briefing Viewer

**Files:**
- Create: `components/pipeline/RunPipelineButton.tsx`
- Create: `components/pipeline/PipelineStatusBadge.tsx`
- Create: `components/pipeline/BriefingCard.tsx`
- Create: `app/(protected)/dashboard/briefings/[month]/page.tsx`
- Modify: `app/(protected)/dashboard/page.tsx`
- Modify: `components/layout/Sidebar.tsx`

### `RunPipelineButton`

Client component — now includes a model selector.

```
[Generate Briefing ▼]
    → GPT-4o
    → GPT-4o mini
    → Claude 3.5 Sonnet        (grey if key not configured)
    → Claude 3 Haiku           (grey if key not configured)
    → Gemini 1.5 Pro           (grey if key not configured)
    → Gemini 1.5 Flash         (grey if key not configured)
    → Gemini 2.0 Flash         (grey if key not configured)
```

Pre-selects the company's saved model from `prompt_configs`. Selecting a new model triggers `PATCH /api/pipeline/config` then `POST /api/pipeline/run`.

States: `idle` | `loading` | `success` (redirect to briefing) | `upToDate` (confirm dialog) | `error` (inline message).

### `BriefingCard`

Renders saved briefing with:
- Month heading + `generated_at` timestamp
- **Provider badge**: e.g. "Generated with Claude 3.5 Sonnet" (use model column)
- Prose-formatted text body
- "Copy to clipboard" client button
- "Regenerate" link (for admins)

### Briefing viewer page

```tsx
// /dashboard/briefings/[month]
// Server Component: fetches briefing + KPI summary
```

Layout: 2/3 briefing card | 1/3 KPI context sidebar + regenerate button.

### Dashboard page update

Below `KpiCardRow`, add a "Portfolio Briefing" panel:
- Shows last briefing date + model if exists.
- Shows "No briefing yet" if none.
- `RunPipelineButton` with model selector (admin only).
- `PipelineStatusBadge` showing last `pipeline_runs` status.

- [ ] **Step 1: Implement `PipelineStatusBadge.tsx`**
- [ ] **Step 2: Implement `BriefingCard.tsx`**
- [ ] **Step 3: Implement `RunPipelineButton.tsx`** with model dropdown
- [ ] **Step 4: Implement briefing viewer page**
- [ ] **Step 5: Add "Briefings" nav item to `Sidebar.tsx`**
- [ ] **Step 6: Update `dashboard/page.tsx`** with briefing panel
- [ ] **Step 7: Write component tests**
- [ ] **Step 8: Run all tests — verify pass**
- [ ] **Step 9: Full manual verification** (see below)
- [ ] **Step 10: Commit**
```
git add components/pipeline/ app/(protected)/dashboard/ components/layout/Sidebar.tsx
git commit -m "feat(pipeline): run button, briefing viewer, dashboard integration"
```

---

## Verification Plan

### Automated Tests
- `lib/pipeline/__tests__/computeHash.test.ts`
- `lib/pipeline/__tests__/getProvider.test.ts`
- `lib/pipeline/__tests__/buildPrompt.test.ts`
- `app/api/pipeline/run/__tests__/route.test.ts` — all status codes, all 3 providers mocked
- `components/pipeline/__tests__/RunPipelineButton.test.tsx`
- Full suite: `npm test` should remain green.

### Manual Verification
1. Complete onboarding with OpenAI + Anthropic keys — both validate and save.
2. From dashboard, select "Claude 3.5 Sonnet" in model dropdown → click Generate.
3. Briefing appears in viewer with "Generated with Claude 3.5 Sonnet" badge.
4. Switch to Gemini model, generate again → new briefing with Gemini badge.
5. Re-generate same month, same data → 409 "up to date" dialog.
6. Upload new reservations, generate again → fresh briefing.
7. Provider without a configured key shows grayed-out option in dropdown.
8. Non-admin cannot see Generate button; API returns 403.
9. `pipeline_runs` table shows correct model and status for each run.
10. BYOS company: briefing in their Supabase, `pipeline_runs` in app Supabase.
