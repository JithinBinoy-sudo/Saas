# Portlio Dashboard — Build Guide

> **For Cursor.** This file is the spec. Read the directives first; they override anything below.

---

## Build directives

These are non-negotiable:

1. **shadcn/ui only.** Every UI element that has a shadcn equivalent MUST use the shadcn component. No custom `<button>`, no custom modal, no custom tab, no custom table, no custom badge, no custom select, no custom avatar, no custom dropdown. If you catch yourself writing `<button className="...">`, stop and use `<Button>`. The only library outside shadcn is **Recharts** (for the chart) and **lucide-react** for icons (which shadcn already pulls in).

2. **No hardcoded colors. Theme tokens only.** Use Tailwind classes that map to shadcn CSS variables: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-destructive`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`, `border-input`, `ring-ring`, etc. For chart series, use `--chart-1` through `--chart-5` (provided by shadcn's chart theme). The user will pick a shadcn-supported palette at the end via the shadcn theme generator — any hardcoded `#a78bfa` or `bg-violet-500` would defeat that. The only acceptable exception is when a token genuinely doesn't exist (e.g., warning amber): use Tailwind's named scales (`amber-500`, `emerald-500`) as a stopgap and flag it with a `// TODO: theme token` comment.

3. **`portlio-dashboard.jsx` is a layout reference, nothing more.** Use it to understand information density, hierarchy, and component arrangement. Do NOT copy its color values, font imports, alpha-tweaked borders, or its `style={{ background: 'linear-gradient...' }}` workarounds. Those decisions are pre-empted by the shadcn theme.

4. **Stop and ask** if a layout decision conflicts with a shadcn primitive's default behavior. Don't fight the library — adapt the layout.

---

## Stack

- React 18+ (Vite or Next.js, your call)
- shadcn/ui — initialize with `npx shadcn@latest init`
- Tailwind CSS (comes with shadcn)
- Recharts — for the Performance & Forecast chart
- lucide-react — for icons (shadcn dependency)
- TypeScript — strongly recommended

## shadcn components to install

```bash
npx shadcn@latest add card button input badge tabs dialog select avatar table tooltip alert separator dropdown-menu chart
```

If any of those aren't available in the current shadcn registry, fall back to the closest equivalent. Don't roll your own.

---

## Product context

Portlio is an AI-powered analytics tool for short-term rental operators. It aggregates booking data across channels (Airbnb, Booking.com), surfaces at-risk properties, and generates an automated monthly executive briefing that gets emailed to property owners as a PDF.

**Primary user:** portfolio analyst (BA / data analyst) at a property management company managing 5–50 short-term rental units. Lives in this dashboard daily.

**The differentiating feature:** the AI briefing — one click, narrated executive summary, delivered to clients monthly.

---

## Information architecture

- **Single-page app.** The dashboard is the product. No left sidebar.
- **Global top header** — persistent, slim. Logo + utility icons.
- **Dashboard content** — scrolls vertically below the header, full viewport width.
- **Generate Briefing modal** — opened from the dashboard's primary CTA.
- **Archive** — accessed from the avatar dropdown OR from the "View archive →" link in Recent Briefings. Implement as a separate route. (A Dialog version is acceptable for v1 if scoping pressure is real.)

---

## Layout structure

```
┌────────────────────────────────────────────────────────┐
│ [P] Portlio · PROPTECH ANALYTICS    🔔  [JA▾]         │  ← Global header (~56px)
├────────────────────────────────────────────────────────┤
│ Portfolio Overview                  [search] [✨ CTA]  │
│ November 2026 ▾                                         │  ← Page header
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌────────┬────────┐          │
│ │ Tabs: Rev|Occ|ADR    │ │ Active │ Nights │          │
│ │ $5,562  ▼51.1% M/M   │ │   4    │   15   │          │  ← KPI strip
│ │ [sparkline]          │ ├────────┼────────┤          │     60/40 split
│ │                      │ │  ADR   │ Occup  │          │
│ └──────────────────────┘ └────────┴────────┘          │
├────────────────────────────────────────────────────────┤
│ Performance & Forecast    [1M|3M|1Y|All] [−][+] [⤢]   │
│                                                         │
│   ───── ─ ─ ─ ─ (forecast)                            │  ← Hero chart
│        ░░░░░ widening band ░░░░░                      │     ~280px tall
│   [brush slider ─────────]                             │
├────────────────────────────────────────────────────────┤
│ ⚠ 3 properties below threshold      View at-risk only →│  ← Risk banner
├────────────────────────────────────────────────────────┤
│ Property Breakdown — sorted by risk                    │
│   ID | Revenue | vs Median | Nights | ADR | vs Prev | …│  ← Table
├────────────────────────────────────────────────────────┤
│ Recent Briefings                       View archive →  │
│ [card] [card]                                          │  ← Briefings strip
└────────────────────────────────────────────────────────┘
```

Container: `<main className="container mx-auto px-6 py-8 space-y-6">`

---

## Screens

### Global header

A slim persistent bar at the top of every screen.

**Structure:** plain `<header>` element (this is chrome, not interactive UI — fine to use a semantic HTML tag).

**Left side:**
- Logo: a small div, `w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold`, displaying `P`.
- Wordmark column: "Portlio" in `text-primary text-sm font-semibold`, with "PROPTECH ANALYTICS" beneath in `text-muted-foreground text-[10px] uppercase tracking-widest`.

**Right side (flex gap-2):**
- `<Button variant="ghost" size="icon">` containing `<Bell />` from lucide.
- `<DropdownMenu>` with the trigger as `<Avatar>` containing `<AvatarFallback>JA</AvatarFallback>`. The `<DropdownMenuContent>` items: Profile, Archive, Upload data, Export data, separator, Settings (disabled), Team & permissions (disabled), separator, Logout.

---

### Dashboard

#### Page header

A flex row that wraps on small screens.

**Left:**
- `<h1 className="text-3xl font-semibold tracking-tight">Portfolio Overview</h1>`
- Below: a `<Select>` styled as a subtle inline control showing the current month. Options: `November 2026`, `October 2026`, `September 2026`, etc. This is the master filter — every metric, chart, and table on the page reflects this selection.

**Right (flex gap-3):**
- `<Input>` with `placeholder="Search properties..."`. Prefix the input with a `<Search />` icon using absolute positioning — shadcn's Input doesn't have a native icon slot.
- `<Button variant="default">` containing `<Sparkles />` icon + "Generate Briefing". This is the primary page CTA. The `default` variant will pick up the user's chosen primary color from their shadcn theme.

#### KPI strip

```jsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
  <Card className="lg:col-span-3 p-6">{/* Total Revenue */}</Card>
  <div className="lg:col-span-2 grid grid-cols-2 gap-3">{/* 4 tiles */}</div>
</div>
```

**Total Revenue card (60% / lg:col-span-3):**
- `<Tabs defaultValue="revenue">` with `<TabsList>` containing triggers for "Total Revenue", "Occupancy", "ADR".
- `<TabsContent value="revenue">`:
  - Small label: "PORTFOLIO PERFORMANCE" (`text-[10px] uppercase tracking-wider text-muted-foreground`)
  - Headline: `$5,562` in `text-5xl font-semibold tabular-nums`
  - Delta: `<Badge variant="destructive">` with `<TrendingDown />` icon + "51.1% M/M"
  - Sparkline: a small Recharts `<ResponsiveContainer height={48}>` showing the historical line only, using `--chart-1`. No axes, no grid, no tooltip.
- `<TabsContent value="occupancy">` and `<TabsContent value="adr">`: same shape, different numbers (12.9% and $371 respectively).

**KPI tile grid (40% / lg:col-span-2):**
- 2×2 grid, each tile is a `<Card className="p-4">`:
  1. Active Properties — `<CalendarDays />` — `4` — sub: "of 7 in portfolio"
  2. Nights Sold — `<Moon />` — `15` — sub: "trailing 30 days"
  3. Portfolio ADR — `<BadgeDollarSign />` — `$371` — sub: "−8.5% M/M" in `text-destructive`
  4. Occupancy — `<PieChart />` — `12.9%` — sub: "below benchmark" in warning color (`text-amber-500` as stopgap)

Tile structure: `[label uppercase muted]  [icon top-right muted]` / `[large value tabular-nums]` / `[small sub]`

#### Performance & Forecast widget

`<Card className="p-6">` — this is the visual anchor of the dashboard. Give it generous height; the chart needs ~280px to read properly.

**Header row (flex justify-between flex-wrap gap-4):**
- Left: `<h2 className="text-base font-semibold">Portfolio Performance & Forecast</h2>` + a small muted subtitle "ARIMA model · updated [date]".
- Right (flex gap-2):
  - Range presets: a small `<Tabs value={range}>` styled as a segmented control with 1M / 3M / 1Y / All. Default = 3M.
  - Two `<Button variant="outline" size="icon">` for Minus and Plus (zoom controls).
  - One `<Button variant="outline" size="icon">` for `<Maximize2 />` (expand to fullscreen).

**Chart body — Recharts `<ComposedChart>` with these layers:**
1. Confidence band: two `<Area>` components — `dataKey="upper"` filled with `chart-2 / 25% opacity`, then `dataKey="lower"` filled with `bg-card` color to mask the area below. This is the "confidence band hack" since Recharts doesn't have a native band component. If you find a cleaner approach (custom SVG path), use that.
2. Historical line: `<Line dataKey="historical" stroke="var(--chart-1)" strokeWidth={2}>` — solid stroke, dots.
3. Forecast line: `<Line dataKey="forecast" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 5" connectNulls={false}>`.
4. Reference line at the historical/forecast junction: `<ReferenceLine x="Nov" strokeDasharray="2 4">` with a "Forecast →" label in `chart-2`.
5. Custom `<Tooltip>` showing date, value, and (in forecast region) the lower/upper bounds.
6. `<XAxis>` and `<YAxis>` with `axisLine={false} tickLine={false}` and muted-foreground tick fill.
7. `<CartesianGrid strokeDasharray="3 3">` with very low-opacity horizontal-only lines.

**Brush slider (under chart):** `<Brush dataKey="month" height={28}>` — Recharts' built-in. The user drags handles to adjust the visible window.

**No scroll-to-zoom.** The chart is controlled exclusively by the range presets, the +/− buttons, and the brush. This is intentional.

#### Risk Alerts banner

A slim full-width clickable strip between the chart and the property table. Toggles the table filter.

- Use shadcn `<Alert>` if its default styling fits the spec; otherwise a custom `<button>` (this is one place rolling custom is acceptable since shadcn doesn't have a perfect primitive). Either way:
  - Layout: `<AlertTriangle />` icon (left) | text (middle) | "View at-risk only →" (right)
  - Background: warning-tinted (`bg-amber-500/10` as a stopgap until a warning theme token exists)
  - Hover: slightly darker tint
- Body text: "**3 properties** are below the yield risk threshold this month."
- **Hide entirely when zero properties are at risk.** This is a hard rule — silence is the right default. No "all healthy!" success state unless the user explicitly asks.

#### Property Breakdown

`<Card className="overflow-hidden">` containing a header row + the shadcn `<Table>`.

**Header row (px-6 py-4, border-b):**
- Title `<h2>Property Breakdown</h2>` + `<p>` subtitle "Trailing 30 days · sorted by risk"
- If filter is active: a chip showing "filtered to at-risk only" with an X button to clear. Use `<Badge variant="outline">` + a small `<Button variant="ghost">` with `<X />`.

**Columns:**
| Column | Treatment |
|--------|-----------|
| Property | `<Building2 />` icon in a small tinted square + property ID in `font-mono` |
| Revenue | right-aligned, `tabular-nums` |
| vs Median | colored arrow + amount; `text-emerald-500` if positive, `text-destructive` if negative |
| Nights | right-aligned integer |
| ADR | right-aligned, `tabular-nums` |
| vs Prev | same treatment as vs Median |
| Risk | `<Badge>` — `variant="destructive"` for High, custom amber variant for Medium, custom emerald variant for Low |

**Default sort:** Risk descending (High first), then Revenue descending. Hardcoded — don't add column-click sorting in v1. The analyst comes here to triage; the default sort is correct.

**Footer:** "Show all N properties →" link in `text-primary` (or accent color), centered, separated by a top border.

#### Recent Briefings strip

A header row + a 2-column grid of preview cards.

- Header: `<h2>Recent Briefings</h2>` + "View archive →" link on the right (`text-primary text-sm font-medium`).
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-3`.
- Each card: `<Card className="p-4 cursor-pointer hover:bg-accent transition-colors">`
  - Top row (flex justify-between): icon-in-square (`<FileText />` in a primary-tinted square) + briefing title + generation date | `<Badge variant="outline">Complete</Badge>`
  - Body: 2-line truncated executive summary preview (`line-clamp-2 text-muted-foreground text-sm`)
  - Footer (border-t pt-3): confidence indicator · page count · model name (all in `text-xs text-muted-foreground`)
- Click a card → opens the briefing in read-mode (the post-generation Dialog state).

---

### Generate Briefing modal

`<Dialog open={open} onOpenChange={setOpen}>` triggered by the page-header CTA.

**Header:**
- Small uppercase tagline above title: `<Sparkles />` + "AI BRIEFING" in `text-primary text-xs font-medium`
- `<DialogTitle>Generate briefing</DialogTitle>`
- `<DialogDescription>` "Create an executive summary of portfolio performance for the selected month, optionally emailed to clients."

**Body (form, space-y-4):**
- `<Input>` for "Briefing name" with placeholder "e.g., Q3 Manhattan Comm". Wrap in a labelled wrapper using shadcn's `<Label>` (install if not already in the components list).
- Two-column grid (`grid grid-cols-2 gap-3`):
  - `<Select>` for "Target month" — default = current month
  - `<Select>` for "Analysis model" — options: GPT-4o mini, GPT-4, Claude Sonnet 4
- `<Input>` for "Email recipients" with placeholder "Add email and press Enter". Implement chip-style tags using `<Badge>` with an X icon for removal. Caption beneath: "Recipients receive the briefing as a PDF when generated. Leave empty to save without sending."

**Footer:**
- `<Button variant="ghost" onClick={close}>Cancel</Button>`
- `<Button variant="default">` with `<Sparkles />` + "Generate briefing"

**Post-generation read-mode (defer to v2 if scoping):** on submit, the same Dialog widens (set className to `sm:max-w-5xl`) and switches to a read view showing the generated briefing content (executive summary, predictive forecast, condensed property table, footer actions for Copy / Download / Send). `<DialogContent>` should scroll internally if content overflows.

---

### Archive (deferred)

Build only after the Dashboard + Modal are working. When you do build it:
- Either a separate route (`/archive`) or a `<Dialog>` opened from the avatar menu — your call.
- Header: `<h1>Archive</h1>` + a search `<Input>`.
- shadcn `<Table>` with columns: Briefing Name | Date Generated | AI Model | Status | Action.
- Action column: `<Button variant="outline" size="sm">View</Button>` and `<Button variant="ghost" size="sm" className="text-destructive">Delete</Button>`.
- Empty state: simple illustration + "No briefings yet" + a primary `<Button>` that opens the Generate modal.

---

## State / interactivity

```typescript
// Page-level state (in the main dashboard component)
const [selectedMonth, setSelectedMonth] = useState('2026-11');
const [revenueTab, setRevenueTab] = useState('revenue');
const [chartRange, setChartRange] = useState<'1M' | '3M' | '1Y' | 'All'>('3M');
const [riskFilterActive, setRiskFilterActive] = useState(false);
const [briefingModalOpen, setBriefingModalOpen] = useState(false);

// Derived
const filteredProperties = useMemo(
  () => riskFilterActive ? properties.filter(p => p.risk !== 'Low') : properties,
  [riskFilterActive, properties]
);

const sortedProperties = useMemo(() => {
  const order = { High: 0, Medium: 1, Low: 2 };
  return [...filteredProperties].sort((a, b) =>
    order[a.risk] - order[b.risk] || b.revenue - a.revenue
  );
}, [filteredProperties]);
```

The chart range buttons (`1M` / `3M` / `1Y` / `All`) and the +/− zoom buttons should mutate `chartRange` and a separate `chartZoom` state. The Brush component manages its own internal range state — wire it to read/write into `chartRange` if you want the toggle and brush to stay in sync.

---

## Mock data

See `portlio-dashboard.jsx` in this repo for the property and briefing mock data. Copy the data shape and values; ignore everything else in that file.

For the chart, the data shape is:

```typescript
type ChartPoint = {
  month: string;        // 'Aug', 'Sep', etc.
  historical?: number;  // null after the historical/forecast boundary
  forecast?: number;    // null before the boundary; required from boundary onward
  lower?: number;       // confidence band lower bound, forecast region only
  upper?: number;       // confidence band upper bound, forecast region only
};
```

The boundary point (e.g., November) has `historical`, `forecast`, `lower`, and `upper` all set to the same value — this anchors the dashed line continuation.

---

## Color & theming (read carefully)

The user will pick a shadcn theme at the end of build. Until then:

| Use case | Class |
|----------|-------|
| Page background | `bg-background` |
| Card surface | `bg-card` (or just rely on `<Card>` default) |
| Subtle fill | `bg-muted` |
| Body text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Accent text / links | `text-primary` |
| Primary CTA | `<Button variant="default">` (no extra classes) |
| Negative deltas, "High" risk pill | `text-destructive` / `<Badge variant="destructive">` |
| Borders | `border-border` (or rely on component defaults) |
| Chart series | `var(--chart-1)`, `var(--chart-2)`, etc. (chart-1 = historical, chart-2 = forecast/band) |

For colors that don't have a shadcn token (warning amber for Medium risk, success emerald for Low risk and positive deltas), use `amber-500` / `emerald-500` from Tailwind's named scales as a stopgap, and add a `// TODO: theme token` comment so they can be replaced later.

---

## Tone & copy

Confident, technical, sparing. Numbers and proper nouns over adjectives. No marketing fluff.

Examples:
- ✓ "3 properties are below the yield risk threshold this month."
- ✗ "Some properties might need attention!"
- ✓ "Trailing 30 days · sorted by risk"
- ✗ "Your latest property performance overview"

Use `$` not `USD`. Use ISO dates (`2026-12-01`) for technical contexts; `Dec 2026` or `Dec 1, 2026` for human-facing labels.

---

## Do not

- Don't roll custom buttons, inputs, dialogs, tabs, tables, badges, selects, avatars, or dropdowns. Use shadcn.
- Don't hardcode hex colors. Use semantic tokens.
- Don't add a left sidebar. The header carries all global navigation.
- Don't add a profile page, settings UI, upload flow, export flow, or team management. Out of scope.
- Don't make the chart support scroll-to-zoom or any gesture interaction. Range presets + buttons + brush only.
- Don't render the Risk Alerts banner when zero properties are at risk.
- Don't add column-click sorting on the Property Breakdown table in v1. The default sort is the correct sort.
- Don't import a Google Font or override `font-family`. Use whatever font shadcn ships with the chosen theme.
- Don't fight shadcn defaults. If a primitive's default behavior conflicts with this spec, surface the conflict — don't silently override.
