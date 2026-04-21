export const landingCopy = {
  nav: {
    brand: 'Portlio',
    links: [
      { label: 'Product', href: '#product' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Security', href: '#security' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Company', href: '#company' },
      { label: 'Blog', href: '#blog' },
      { label: 'Changelog', href: '#changelog' },
    ],
    ctas: {
      login: { label: 'Login', href: '/auth' },
      startTrial: { label: 'Start free trial', href: '/auth?tab=signup' },
      signUp: { label: 'Sign up', href: '/auth?tab=signup' },
    },
  },
  hero: {
    eyebrow: 'AI portfolio intelligence',
    titleA: 'Monthly',
    titleB: 'portfolio intelligence',
    subtitle:
      'Connect your data (hosted or BYOS Supabase), track performance by month, and generate data-only executive briefings for every stakeholder.',
    primaryCta: { label: 'Start your 14-day trial', href: '/auth?tab=signup' },
  },
  features: {
    title: 'Built for speed',
    items: [
      {
        title: 'Hosted or BYOS Supabase',
        description: 'Use Portlio’s hosted mode or connect your own Supabase project (BYOS).',
      },
      {
        title: 'Excel upload + mapping',
        description: 'Upload reservation exports and map columns once with a guided wizard.',
      },
      {
        title: 'Monthly analytics',
        description: 'KPIs, revenue trends, channel mix, and property breakdown by month.',
      },
      {
        title: 'AI executive briefings',
        description: 'Generate consistent, data-only briefings across months and portfolios.',
      },
      {
        title: 'Prompt test suite (admin)',
        description: 'Preview outputs without saving and tune system/user prompts safely.',
      },
      {
        title: 'Exports',
        description: 'Export clean Excel reports for stakeholders and downstream tools.',
      },
      {
        title: 'BYOS sync runs',
        description: 'Track sync status and history when pulling data from BYOS sources.',
      },
      {
        title: 'Audit-friendly history',
        description: 'Review prior pipeline runs and recent briefings month-over-month.',
      },
    ],
  },
  ai: {
    eyebrow: 'Portlio AI',
    title: 'Briefings with a multi-provider AI runner',
    subtitle:
      'Run monthly portfolio briefings with your preferred model provider. Tune prompts, test outputs, and standardize formatting across your organization.',
    bulletsTitle: 'What can you do with Portlio AI?',
    bullets: [
      'Generate data-only executive briefings for each revenue month',
      'Choose your model (OpenAI, Anthropic, Gemini) and parameters',
      'Preview “Test prompt” runs without saving briefings',
      'Standardize output structure across teams and properties',
      'Maintain an audit trail of pipeline runs and recent briefings',
    ],
  },
  connected: {
    title: 'Portfolio signals, connected',
    subtitle:
      'Connect reservations, occupancy and revenue into a single monthly view. Portlio turns raw exports into consistent metrics and briefing-ready narratives.',
    bullets: [
      'One canonical dataset. Normalize uploads or BYOS tables into consistent fields.',
      'Monthly context. Compare deltas across months with the same definitions every time.',
    ],
  },
  research: {
    title: 'Bring your data',
    subtitle:
      'Start with Excel exports today, and graduate to BYOS Supabase when you want deeper automation.',
    bullets: [
      {
        title: 'Excel-first onboarding',
        description: 'Upload reservation spreadsheets and map required fields in minutes.',
      },
      {
        title: 'BYOS-ready',
        description: 'Deploy the schema to your Supabase project and sync runs with visibility.',
      },
    ],
  },
  security: {
    eyebrow: 'Encryption',
    title: 'Hardened security',
    subtitle:
      'Sensitive credentials are stored securely. Admin-only settings are guarded, and BYOS keeps data in your own Supabase when you choose it.',
  },
  meetings: {
    eyebrow: 'Stakeholders',
    title: 'Briefings built for reporting cycles',
    subtitle:
      'Create a monthly cadence: upload/sync data, review dashboards, and publish a consistent executive briefing for each month.',
  },
  integrations: {
    eyebrow: 'Integrations',
    title: 'Use Portlio with other apps',
    subtitle:
      'Export and connect to your existing data stack. Start lightweight, automate over time.',
    items: [
      { title: 'Supabase', description: 'Hosted mode or BYOS connections with schema deploy + sync' },
      { title: 'Excel export', description: 'Two-sheet workbooks for summary + raw reservations' },
      { title: 'Model providers', description: 'Use OpenAI, Anthropic, or Gemini keys by workspace' },
      { title: 'Automations', description: 'Hook exports into your workflows (BI, ops, reporting)' },
    ],
  },
  pricing: {
    eyebrow: 'Get access',
    title: 'Simple pricing',
    subtitle: 'One plan, one price. Upgrade when you need deeper automation.',
    price: '$10',
    priceSub: '/month (billed annually)',
    features: [
      'Hosted or BYOS mode',
      'Excel upload + column mapping',
      'Monthly analytics dashboard',
      'AI briefings (multi-provider)',
      'Prompt testing suite (admin)',
      'Excel exports',
    ],
    cta: { label: 'Start your 14-day trial', href: '/auth?tab=signup' },
  },
  testimonials: {
    eyebrow: 'Wall of love',
    title: 'Loved by operators',
    subtitle: 'What teams say after switching to a monthly briefing cadence',
  },
  footer: {
    newsletter: 'Get portfolio ops workflows in our weekly newsletter.',
  },
} as const;

