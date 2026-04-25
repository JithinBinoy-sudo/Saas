"""
Lightweight backtest for the portfolio forecast.

Purpose:
- Quantify accuracy over time as more months of history are acquired.
- Compare predicted next-month (and next 3 months) totals vs actual totals.

Notes:
- Uses the same ETS model code as production (run_ets_forecast).
- Uses a rolling 6-month window (same as API).
- Requires env vars:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - COMPANY_ID
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from supabase import create_client

from models.ets_model import run_ets_forecast


TRAINING_MIN_MONTHS = 6
# Fastest improvement: use exactly last 6 months to predict the 7th.
ROLLING_WINDOW_MONTHS = 6
HORIZON_MONTHS = 1


@dataclass(frozen=True)
class ScoreRow:
    as_of_month: str
    horizon: int
    actual: float
    predicted: float
    mape: float | None
    smape: float | None


def month_str(d: pd.Timestamp) -> str:
    return d.to_period("M").to_timestamp().strftime("%Y-%m-%d")


def smape(y_true: float, y_pred: float) -> float:
    denom = (abs(y_true) + abs(y_pred))
    if denom == 0:
        return 0.0
    return 2.0 * abs(y_pred - y_true) / denom


def mape(y_true: float, y_pred: float) -> float | None:
    if y_true == 0:
        return None
    return abs((y_true - y_pred) / y_true)


def fetch_monthly_totals(company_id: str) -> pd.DataFrame:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    sb = create_client(url, key)
    # Pull property-month rows and aggregate locally to avoid needing extra SQL endpoints.
    resp = (
        sb.table("monthly_metrics_silver")
        .select("revenue_month, listing_id, revenue")
        .eq("company_id", company_id)
        .order("revenue_month")
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise RuntimeError("No rows returned from monthly_metrics_silver")

    df = pd.DataFrame(rows)
    df["revenue_month"] = pd.to_datetime(df["revenue_month"])
    df["revenue"] = df["revenue"].astype(float).fillna(0)
    df["listing_id"] = df["listing_id"].astype(str)

    g = df.groupby("revenue_month", as_index=False).agg(
        total_revenue=("revenue", "sum"),
        property_count=("listing_id", pd.Series.nunique),
    )
    g = g.sort_values("revenue_month").reset_index(drop=True)
    g["per_property_revenue"] = g.apply(
        lambda r: (r["total_revenue"] / r["property_count"]) if r["property_count"] else 0.0,
        axis=1,
    )
    g["revenue_month"] = g["revenue_month"].dt.to_period("M").dt.to_timestamp()
    return g


def iter_anchors(months: Iterable[pd.Timestamp]) -> list[pd.Timestamp]:
    months = sorted(set(months))
    # Need at least TRAINING_MIN_MONTHS months before an anchor is eligible.
    return months[TRAINING_MIN_MONTHS - 1 : -HORIZON_MONTHS] if len(months) > TRAINING_MIN_MONTHS else []


def run_backtest(df: pd.DataFrame) -> list[ScoreRow]:
    scores: list[ScoreRow] = []
    months = list(df["revenue_month"])
    anchors = iter_anchors(months)

    for as_of in anchors:
        hist = df[df["revenue_month"] <= as_of].copy()
        hist = hist.tail(max(TRAINING_MIN_MONTHS, ROLLING_WINDOW_MONTHS))
        if len(hist) < TRAINING_MIN_MONTHS:
            continue

        points = [{"ds": month_str(r["revenue_month"]), "y": float(r["total_revenue"])} for _, r in hist.iterrows()]

        forecasts = run_ets_forecast(points)
        if not forecasts:
            continue

        # Map forecast month -> predicted total revenue
        by_month = {pd.to_datetime(f["forecast_month"]).to_period("M").to_timestamp(): float(f["predicted_revenue"]) for f in forecasts}

        for h in range(1, HORIZON_MONTHS + 1):
            target_month = (pd.to_datetime(as_of).to_period("M").to_timestamp() + pd.DateOffset(months=h)).to_period("M").to_timestamp()
            actual_row = df[df["revenue_month"] == target_month]
            if actual_row.empty:
                continue
            actual_total = float(actual_row.iloc[0]["total_revenue"])

            pred_total = float(by_month.get(target_month, 0.0))

            scores.append(
                ScoreRow(
                    as_of_month=month_str(as_of),
                    horizon=h,
                    actual=actual_total,
                    predicted=pred_total,
                    mape=mape(actual_total, pred_total),
                    smape=smape(actual_total, pred_total),
                )
            )

    return scores


def summarize(scores: list[ScoreRow]) -> str:
    if not scores:
        return "No backtest rows (not enough data or forecasting failed)."

    df = pd.DataFrame([s.__dict__ for s in scores])
    out: list[str] = []
    out.append(f"Rows: {len(df)}")

    for h in sorted(df["horizon"].unique()):
        sub = df[df["horizon"] == h]
        mape_vals = sub["mape"].dropna()
        smape_vals = sub["smape"].dropna()
        out.append(f"\nHorizon +{h} month(s)")
        out.append(f"  sMAPE mean: {float(smape_vals.mean()):.3f}, median: {float(smape_vals.median()):.3f}")
        if len(mape_vals) > 0:
            out.append(f"  MAPE  mean: {float(mape_vals.mean()):.3f}, median: {float(mape_vals.median()):.3f}")
        else:
            out.append("  MAPE: N/A (actual=0 rows)")

    return "\n".join(out)


def main() -> None:
    company_id = os.environ.get("COMPANY_ID", "").strip()
    if not company_id:
        raise RuntimeError("Missing COMPANY_ID env var")

    df = fetch_monthly_totals(company_id)
    scores = run_backtest(df)
    print(summarize(scores))


if __name__ == "__main__":
    main()

