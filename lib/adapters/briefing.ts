export type BriefingSummary = {
  id: string;
  title: string;
  date: string;
  status: 'Complete' | 'Draft';
  summary: string;
  pages: number;
  confidence: number;
  model: string;
};

export type BriefingDbRow = {
  revenue_month: string;
  generated_at: string | null;
  briefing_name: string | null;
  model: string | null;
  portfolio_summary: unknown;
};

function monthLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shortDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toISOString().slice(0, 10);
}

function summarize(portfolioSummary: unknown): { summary: string; pages: number } {
  if (typeof portfolioSummary === 'string') {
    return { summary: portfolioSummary, pages: estimatePages(portfolioSummary) };
  }
  if (portfolioSummary && typeof portfolioSummary === 'object') {
    const obj = portfolioSummary as Record<string, unknown>;
    const candidate =
      (typeof obj.summary === 'string' && obj.summary) ||
      (typeof obj.executive_summary === 'string' && obj.executive_summary) ||
      '';
    return { summary: candidate, pages: estimatePages(candidate) };
  }
  return { summary: '', pages: 0 };
}

function estimatePages(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 1800));
}

export function toBriefingSummary(row: BriefingDbRow): BriefingSummary {
  const { summary, pages } = summarize(row.portfolio_summary);
  return {
    id: row.revenue_month,
    title: row.briefing_name?.trim() || `${monthLabel(row.revenue_month)} Portfolio Briefing`,
    date: shortDate(row.generated_at),
    status: 'Complete',
    summary,
    pages,
    confidence: 0.9,
    model: row.model ?? 'GPT-4o',
  };
}

export function toBriefingSummaries(rows: BriefingDbRow[]): BriefingSummary[] {
  return rows.map(toBriefingSummary);
}
