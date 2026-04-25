"""
Prophet-based forecasting model.
Used when 6–23 months of data are available, or in degraded mode for < 6 months.
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from dateutil.relativedelta import relativedelta


def run_prophet_forecast(
    points: list[dict], degraded: bool = False
) -> list[dict] | None:
    """
    Fit Prophet on the given monthly data points and return a multi-month forecast.

    Args:
        points: List of {"ds": "YYYY-MM-DD", "y": float} sorted by date.
        degraded: If True, uses wider uncertainty intervals.

    Returns:
        List of dicts with forecast_month, predicted_revenue, lower_bound, upper_bound
        or None if fitting fails.
    """
    try:
        df = pd.DataFrame(points)
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        # Ensure no negative values (revenue can't be negative)
        df["y"] = df["y"].clip(lower=0)

        # Model non-negativity by fitting in log space.
        # This avoids "negative forecasts -> clamp to 0 -> all-zero forecasts" collapse.
        df["y"] = np.log1p(df["y"])

        model = Prophet(
            yearly_seasonality="auto",
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.6 if degraded else 0.8,
            changepoint_prior_scale=0.05 if degraded else 0.1,
        )
        model.fit(df)

        # Predict 1 month ahead (monthly)
        last_date = df["ds"].max()
        future_dates = [last_date + relativedelta(months=1)]
        future_df = pd.DataFrame({"ds": future_dates})
        forecast = model.predict(future_df)

        results: list[dict] = []
        for _, row in forecast.iterrows():
            ds = row["ds"]
            yhat = float(row["yhat"])
            yhat_lower = float(row["yhat_lower"])
            yhat_upper = float(row["yhat_upper"])

            # Invert log transform back to revenue space
            pred = float(np.expm1(yhat))
            lower = float(np.expm1(yhat_lower))
            upper = float(np.expm1(yhat_upper))

            results.append(
                {
                    "forecast_month": pd.to_datetime(ds).strftime("%Y-%m-%d"),
                    "predicted_revenue": max(0, pred),
                    "lower_bound": max(0, lower),
                    "upper_bound": max(0, upper),
                }
            )
        return results
    except Exception as e:
        import logging

        logging.getLogger(__name__).error(f"Prophet forecast failed: {e}")
        return None
