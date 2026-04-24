# Phase 9 — Predictive Analytics

Add forward-looking signals to the Portlio dashboard using a dedicated ML forecasting service
deployed on Railway, alongside Postgres-based risk scoring.

---

## Architecture Overview

```
reservations → monthly_metrics_silver
                      ↓
         property_risk_score_silver (Postgres view)
                      ↓                          ↓
         risk_score in PropertyTable    Railway Forecast Service (Python)
                                                  ↓
                                        Prophet  ─OR─  ARIMA
                                                  ↓
                                        revenue_forecasts table (Supabase)
                                                  ↓
                             Next.js reads forecast → Trend Chart + Briefing Viewer
```

---

## Scope

Four features, delivered in this order:

| # | Feature | Where it shows |
|---|---|---|
| 1 | **Occupancy Risk Score** | Risk badge per property in the Property Table |
| 2 | **Railway Forecast Service** | Python FastAPI service deployed on Railway |
| 3 | **Next-Month Revenue Forecast** | Dashed forecast point on the Trend Chart |
| 4 | **AI Predictive Briefing** | New "Forecast" tab in the Briefing Viewer |

---

## Proposed Changes

### 1. Database — New Migration

#### [NEW] `supabase/migrations/010_predictive_views.sql`

One new Postgres view for risk scoring, plus a new table to store ML forecast results.

**`property_risk_score_silver`**

Computes a 0–100 composite risk score per property per month using three signals:
- Number of negative MoM months in the last 3 months (momentum)
- Revenue vs. portfolio median (relative underperformance)
- Most recent MoM delta magnitude (acceleration of decline)

```sql
CREATE OR REPLACE VIEW property_risk_score_silver
  WITH (security_invoker = on) AS
SELECT
  m.company_id, m.listing_id, m.listing_nickname, m.revenue_month,
  SUM(CASE WHEN t.revenue_delta < 0 THEN 1 ELSE 0 END)
    OVER (PARTITION BY m.company_id, m.listing_id
          ORDER BY m.revenue_month
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS negative_months_in_3m,
  CASE WHEN b.portfolio_median_revenue > 0
       THEN (m.revenue - b.portfolio_median_revenue) / b.portfolio_median_revenue
       ELSE NULL END AS revenue_vs_median_pct,
  LEAST(100, GREATEST(0,
    (SUM(CASE WHEN t.revenue_delta < 0 THEN 1 ELSE 0 END)
       OVER (PARTITION BY m.company_id, m.listing_id
             ORDER BY m.revenue_month
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) * 20)
    + CASE WHEN m.revenue < b.portfolio_median_revenue * 0.7 THEN 30 ELSE 0 END
    + CASE WHEN t.revenue_delta < -0.2 * m.revenue    THEN 30 ELSE 0 END
  )) AS risk_score
FROM monthly_metrics_silver m
LEFT JOIN mom_trends_silver t
  USING (company_id, listing_id, revenue_month)
LEFT JOIN portfolio_benchmarking_silver b
  USING (company_id, listing_id, revenue_month);
```

**`revenue_forecasts` table**

Stores forecast results written by the Railway service so the dashboard reads from the DB, not the service directly.

```sql
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  company_id         uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  listing_id         text        NOT NULL,
  forecast_month     date        NOT NULL,  -- the month being predicted
  predicted_revenue  numeric(14,2) NOT NULL,
  lower_bound        numeric(14,2),         -- 80% confidence lower
  upper_bound        numeric(14,2),         -- 80% confidence upper
  model_used         text        NOT NULL,  -- 'prophet' or 'arima'
  generated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, listing_id, forecast_month)
);

ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecasts_company_isolation" ON revenue_forecasts
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

---

### 2. Railway Forecast Service (Python)

#### [NEW] `forecast-service/` (separate folder in repo root, deployed to Railway)

A lightweight FastAPI app that accepts historical monthly revenue data, fits a model, and writes results back to Supabase.

**File structure:**
```
forecast-service/
├── main.py           ← FastAPI app
├── models/
│   ├── prophet_model.py   ← Prophet implementation
│   └── arima_model.py     ← ARIMA implementation
├── requirements.txt
└── Procfile          ← web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Model selection logic:**

| Data available | Model used | Reason |
|---|---|---|
| ≥ 24 months | **ARIMA** | Enough data for ARIMA to capture autocorrelation accurately |
| 6–23 months | **Prophet** | Handles seasonality well with shorter history |
| < 6 months | Prophet (degraded) | Returns forecast with wider confidence bands; warns in response |

**`requirements.txt`:**
```
fastapi
uvicorn
prophet
statsmodels
pandas
supabase
```

**API endpoint:**

```
POST /forecast
Body: {
  "company_id": "uuid",
  "data": [{ "ds": "2024-01-01", "y": 12500.00, "listing_id": "..." }, ...]
}

Response: {
  "forecasts": [
    {
      "listing_id": "...",
      "forecast_month": "2024-07-01",
      "predicted_revenue": 13200.00,
      "lower_bound": 11800.00,
      "upper_bound": 14600.00,
      "model_used": "prophet"
    }
  ]
}
```

After computing, the service writes results directly to the `revenue_forecasts` Supabase table using the service role key (passed as an environment variable on Railway).

**Trigger:** The service is called by `POST /api/forecast/run` in Next.js — triggered automatically after a successful data upload, not on every page load.

**Railway deployment:**
- Platform: Railway ($5/month Hobby plan — up to 48 GB RAM, no spin-down)
- Environment variables set in Railway dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Deploy via git push (Railway auto-detects `requirements.txt` and `Procfile`)

---

### 3. Analytics Query Layer

#### [MODIFY] `lib/analytics/types.ts`

- Add `risk_score: number | null` to `PropertyMonthRow`
- Add to `DashboardData`:
  ```ts
  forecastPoint: {
    month: string;
    predicted_revenue: number;
    lower_bound: number | null;
    upper_bound: number | null;
    model_used: 'prophet' | 'arima';
  } | null;
  ```

#### [MODIFY] `lib/analytics/queries.ts`

- Extend `fetchPropertyRows()` to join `property_risk_score_silver` and return `risk_score`
- Add `fetchForecastPoint()` — queries `revenue_forecasts` for the latest forecast month at portfolio level (sum of `predicted_revenue` across all listing_ids for the company)
- Wire both into `fetchDashboardData()` via `Promise.all`

#### [NEW] `app/api/forecast/run/route.ts`

Next.js API route that:
1. Fetches the company's historical monthly data from Supabase
2. `POST`s it to the Railway service URL
3. Returns `{ status: 'queued' }` immediately (fire-and-forget — the Railway service writes results to the DB directly)

---

### 4. AI Pipeline — Predictive Briefing

#### [MODIFY] `lib/pipeline/defaultPrompts.ts`

Add `PREDICTIVE_SYSTEM_PROMPT` — takes the last 12 months of trend data plus the ML forecast result and outputs a forward-looking section with three parts:
1. Portfolio-level expected revenue range (from Prophet/ARIMA `lower_bound`–`upper_bound`)
2. Properties to watch (2+ consecutive months of decline, from risk score data)
3. Channel shift signal (any channel with >5% share change in last 3 months)

#### [MODIFY] `lib/pipeline/types.ts`

Add `forecastMode: boolean` flag to `PipelineInput`.

#### [MODIFY] `app/api/pipeline/run/route.ts`

When `forecastMode: true`, use `PREDICTIVE_SYSTEM_PROMPT` and include the `revenue_forecasts` results in the prompt payload.

---

### 5. Dashboard UI

#### [MODIFY] `components/dashboard/PropertyTable.tsx`

- Add a **Risk** column (rightmost)
- Colour-coded badge based on `risk_score`:
  - 🟢 `0–30` → Low
  - 🟡 `31–60` → Medium
  - 🔴 `61–100` → High
- If `risk_score` is null (not enough history), show `—`

#### [MODIFY] `components/dashboard/DashboardContent.tsx`

- When `forecastPoint` is present:
  - Draw a **dashed line segment** from the last actual data point to the forecast point on the trend SVG
  - Render the forecast point as a **hollow circle**
  - Add a **shaded band** between `lower_bound` and `upper_bound` to show confidence interval
  - Label: `"Forecast (Prophet)"` or `"Forecast (ARIMA)"` based on `model_used`

#### [MODIFY] `components/briefings/` (Briefing Viewer)

- Add a **"Forecast" tab** next to the existing "Briefing" tab
- Forecast tab shows:
  - `model_used` badge (Prophet / ARIMA)
  - A **"Generate Forecast Briefing"** button → calls `POST /api/pipeline/run` with `forecastMode: true`
  - Renders `briefing_text` in the same markdown viewer

---

## Verification Plan

### Automated Tests
- Unit tests for `fetchForecastPoint()` and updated `fetchPropertyRows()` in `lib/analytics/__tests__/`
- Unit test for `buildPrompt` with `forecastMode: true` asserting `PREDICTIVE_SYSTEM_PROMPT` is selected
- Integration test for `POST /api/forecast/run` mocking the Railway service response

### Manual Verification
- Deploy Railway service, hit `/forecast` endpoint directly with sample data, confirm response shape
- Upload 3+ months of reservation data → confirm forecast runs automatically post-upload
- Confirm risk badges appear in Property Table
- Confirm forecast dashed line + confidence band render on the trend chart
- Trigger Forecast briefing → verify AI output matches the 3-section structure

---

## Infrastructure Summary

| Component | Platform | Plan | Cost |
|---|---|---|---|
| Database (Supabase) | Supabase | Existing | Existing |
| Next.js App | Vercel | Existing | Existing |
| ML Forecast Service | Railway | Hobby ($5/month) | ~$1–2 of the $5 credit used |

---

## Design Specifications

All new elements follow the existing design language:
- **Dark glassmorphism** — `bg-surface-container/60 backdrop-blur-xl` with `ghost-border`
- **Font** — Inter (`font-headline` for headings, `font-body` for body text)
- **Icons** — Material Symbols Outlined
- **Shadows** — `shadow-[0px_20px_40px_rgba(0,0,0,0.4)]`
- **Colour tokens** — use existing Tailwind tokens only, no hardcoded hex values in components

---

### A. Risk Badge (PropertyTable)

Matches the existing MoM delta badge pattern in `DashboardContent.tsx`.

| State | Background | Text | Border | Icon |
|---|---|---|---|---|
| 🟢 Low (0–30) | `bg-tertiary/10` | `text-tertiary` | `border-tertiary/20` | `check_circle` |
| 🟡 Medium (31–60) | `bg-secondary/10` | `text-secondary` | `border-secondary/20` | `warning` |
| 🔴 High (61–100) | `bg-error/10` | `text-error` | `border-error/20` | `error` |
| — No data | none | `text-on-surface-variant` | none | none |

**Badge anatomy:**
```
[ icon  label ]
  14px  text-xs font-medium px-2 py-0.5 rounded-md border
  flex items-center gap-1
```

Example Tailwind classes for the High state:
```
className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border
           text-xs font-medium bg-error/10 text-error border-error/20"
```

---

### B. Forecast Overlay on Trend Chart (DashboardContent)

The forecast is appended to the existing SVG trend chart (viewBox `0 0 1000 200`).

**Dashed connector line**
- Connects last actual data point → forecast point
- `stroke="#adaaad"` (`on-surface-variant` hex) — muted, visually distinct from the solid gradient line
- `strokeWidth="2"` `strokeDasharray="6 4"` `strokeLinecap="round"`

**Forecast point circle**
- Outer ring: `r="8"` `fill="none"` `stroke="#adaaad"` `strokeWidth="2"` `strokeDasharray="4 3"` — hollow dashed, clearly not an actual data point
- Inner dot: `r="3"` `fill="#adaaad"`

**Confidence band (shaded area between lower_bound and upper_bound)**
- Rendered as an SVG `<path>` fill between the upper and lower bound y-coordinates at the forecast x position
- `fill="#adaaad"` `fillOpacity="0.08"` — extremely subtle, consistent with the existing `wave-gradient` fill opacity
- Only shown when `lower_bound` and `upper_bound` are non-null

**Forecast label chip**
- Small pill above the forecast point (same style as the existing value tooltip rect)
- `fill="#262528"` (`surface-container-highest`) `stroke="#48474a"` (`outline-variant`) `rx="10"`
- Text: `fill="#adaaad"` `fontSize="10"` `fontFamily="Inter"` — reads `"Forecast (Prophet)"` or `"Forecast (ARIMA)"`

**Legend addition**
- Add a small legend row below the chart x-axis labels:
  - `— —` dashed line sample + `"Forecast"` label in `text-on-surface-variant text-xs`
  - Sits inline with the existing month labels row, right-aligned

---

### C. Forecast Tab — Briefing Viewer

Matches the existing tab pattern used for Total Revenue / Occupancy / ADR in `DashboardContent.tsx`.

**Tab bar**
- Existing tab: `"Briefing"` (already present)
- New tab: `"Forecast"` — same `TabButton` component, same `border-b border-white/5 pb-2` container

**Model badge** (shown when a forecast exists)
```
bg-surface-container-high text-on-surface-variant text-xs px-3 py-1 rounded-full border border-white/10
```
Reads `"Prophet"` or `"ARIMA"` — same style as the existing `"MoM"` badge in the Revenue Trend card.

**Empty state (no forecast generated yet)**
```
bg-surface-container/60 backdrop-blur-xl rounded-xl ghost-border p-8
shadow-[0px_20px_40px_rgba(0,0,0,0.4)]
```
- Icon: `auto_graph` Material Symbol, `text-[40px] text-on-surface-variant`
- Heading: `text-on-surface font-semibold` — `"No forecast generated yet"`
- Body: `text-on-surface-variant text-sm` — `"Run a forecast to see next-month predictions with confidence intervals."`
- CTA button: matches the existing pipeline run button style — `bg-primary text-on-primary rounded-full px-5 py-2.5 text-sm font-medium`

**Loading state (forecast running)**
- Same spinner pattern used elsewhere in the app
- Subtitle: `text-on-surface-variant text-sm` — `"Running forecast model… this takes a few seconds."`

**Result state**
- Rendered in the same markdown viewer as the regular briefing (`portfolio_summary` field)
- `generated_at` timestamp shown below in `text-on-surface-variant text-xs`

---

### D. Ambient Glow (new cards / panels)

Any new glassmorphism panel added for predictive features should include the ambient glow consistent with existing KPI cards:

```jsx
<div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full blur-[20px]
                bg-tertiary/10 transition-all group-hover:bg-tertiary/20" />
```

Use `tertiary` (`#69daff`) for forecast-related panels to differentiate them visually from the revenue-primary (`#85adff`) and secondary/purple (`#c180ff`) cards already on the dashboard.
