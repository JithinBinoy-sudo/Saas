export type ParsedExcel = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ColumnMappingsBlob = {
  required: Record<string, string>;
  custom_fields: string[];
  skipped: string[];
};

export type ReservationRecord = {
  confirmation_code: string;
  listing_nickname: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  net_accommodation_fare: number;
  listing_id: string;
  data: Record<string, string | number | null>;
};

export type RowError = {
  row: number;
  field: string;
  message: string;
};

export type UploadSummary = {
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: RowError[];
};
