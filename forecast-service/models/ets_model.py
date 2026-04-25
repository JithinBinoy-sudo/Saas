"""
ETS (Exponential Smoothing) forecasting model.

Designed for short monthly series and 1-step-ahead forecasts.
We forecast a single next month point and estimate an 80% interval using
residual dispersion on the training window.
"""

from __future__ import annotations

import math
from dateutil.relativedelta import relativedelta

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing


Z_80 = 1.2815515655446004  # two-sided central 80% interval


def _month_start(ts: pd.Timestamp) -> pd.Timestamp:
    return ts.to_period("M").to_timestamp()


def run_ets_forecast(points: list[dict]) -> list[dict] | None:
    """
    Fit ETS on the given monthly data points and return a 1-month-ahead forecast.

    Args:
        points: List of {"ds": "YYYY-MM-DD", "y": float} sorted by date.

    Returns:
        List with one dict:
          {forecast_month, predicted_revenue, lower_bound, upper_bound}
        or None if fitting fails.
    """
    try:
        df = pd.DataFrame(points)
        if df.empty:
            return None

        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float).clip(lower=0)
        df = df.sort_values("ds").reset_index(drop=True)

        ts = df.set_index("ds")["y"]
        ts.index = pd.DatetimeIndex(ts.index)
        ts.index = ts.index.to_period("M").to_timestamp()

        # Non-seasonal ETS with (optionally damped) trend is a good default for short series.
        model = ExponentialSmoothing(
            ts,
            trend="add",
            damped_trend=True,
            seasonal=None,
            initialization_method="estimated",
        )
        fit = model.fit(optimized=True)

        # One-step forecast
        fc = fit.forecast(1)
        pred = float(fc.iloc[0])

        # Residual-based interval: use in-sample one-step errors as dispersion estimate.
        fitted = fit.fittedvalues
        errs = (ts - fitted).dropna()
        sigma = float(errs.std(ddof=1)) if len(errs) >= 3 else float(errs.std(ddof=0)) if len(errs) >= 2 else 0.0
        if not math.isfinite(sigma):
            sigma = 0.0

        lower = pred - Z_80 * sigma
        upper = pred + Z_80 * sigma

        # Clamp to non-negative
        pred = max(0.0, pred)
        lower = max(0.0, lower)
        upper = max(0.0, upper)

        last_date = pd.to_datetime(df["ds"].max())
        next_month = (last_date + relativedelta(months=1))
        next_month = _month_start(pd.Timestamp(next_month))

        return [
            {
                "forecast_month": next_month.strftime("%Y-%m-%d"),
                "predicted_revenue": pred,
                "lower_bound": lower,
                "upper_bound": upper,
            }
        ]
    except Exception as e:
        import logging

        logging.getLogger(__name__).error(f"ETS forecast failed: {e}")
        return None

