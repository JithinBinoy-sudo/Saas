export type SummaryRow = {
  revenue_month: string;
  listing_nickname: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
  portfolio_median_revenue: number | null;
};

export type RawReservationRow = {
  confirmation_code: string;
  listing_nickname: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  net_accommodation_fare: number;
  listing_id: string;
  data: Record<string, string | number | null>;
};

export type AiBriefingRow = {
  revenue_month: string;
  briefing_text: string;
};

export type ReportInput = {
  summary: SummaryRow[];
  reservations: RawReservationRow[];
  aiBriefings: AiBriefingRow[];
  generatedAt: Date;
  companyName: string;
};
