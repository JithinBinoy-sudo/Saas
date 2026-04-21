-- Improve channel mix labeling by supporting common header variants.
-- Some uploads store channel/source as custom fields under original Excel header names,
-- so the canonical JSON keys (data->>'channel', data->>'source') may be missing.

-- Recreate nights_exploded_silver with broader JSON key fallbacks.
CREATE OR REPLACE VIEW nights_exploded_silver
  WITH (security_invoker = on) AS
SELECT
  r.company_id,
  r.confirmation_code,
  r.listing_id,
  r.listing_nickname,
  COALESCE(
    (r.data->>'source'),
    (r.data->>'Source'),
    (r.data->>'Booking Source'),
    (r.data->>'booking_source'),
    (r.data->>'bookingSource'),
    (r.data->>'Marketplace'),
    (r.data->>'Origin')
  ) AS source,
  COALESCE(
    (r.data->>'channel'),
    (r.data->>'Channel'),
    (r.data->>'Booking Channel'),
    (r.data->>'booking_channel'),
    (r.data->>'bookingChannel'),
    (r.data->>'OTA'),
    (r.data->>'Platform'),
    (r.data->>'platform')
  ) AS channel,
  (r.data->>'currency') AS currency,
  (r.check_in_date + gs)::date                      AS night_date,
  date_trunc('month', (r.check_in_date + gs))::date AS revenue_month,
  CASE WHEN r.nights > 0
       THEN r.net_accommodation_fare / r.nights
       ELSE 0
  END                                               AS nightly_fare
FROM reservations r
CROSS JOIN LATERAL generate_series(0, GREATEST(r.nights - 1, 0)) AS gs
WHERE r.nights > 0;

-- monthly_channel_mix_silver and downstream views depend on nights_exploded_silver;
-- no changes needed here because they already use COALESCE(channel, source, 'unknown').

