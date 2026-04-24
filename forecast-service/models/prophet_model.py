"""
Prophet-based forecasting model.
Used when 6–23 months of data are available, or in degraded mode for < 6 months.
"""

import pandas as pd
from prophet import Prophet
from dateutil.relativedelta import relativedelta


def run_prophet_forecast(
    points: list[dict], degraded: bool = False
) -> dict | None:
    """
    Fit Prophet on the given monthly data points and return a 1-month-ahead forecast.

    Args:
        points: List of {"ds": "YYYY-MM-DD", "y": float} sorted by date.
        degraded: If True, uses wider uncertainty intervals.

    Returns:
        Dict with forecast_month, predicted_revenue, lower_bound, upper_bound
        or None if fitting fails.
    """
    try:
        df = pd.DataFrame(points)
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        # Ensure no negative values (revenue can't be negative)
        df["y"] = df["y"].clip(lower=0)

        model = Prophet(
            yearly_seasonality=True if len(df) >= 12 else False,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.6 if degraded else 0.8,
            changepoint_prior_scale=0.05 if degraded else 0.1,
        )
        model.fit(df)

        # Predict 1 month ahead
        last_date = df["ds"].max()
        future_date = last_date + relativedelta(months=1)
        future_df = pd.DataFrame({"ds": [future_date]})
        forecast = model.predict(future_df)

        row = forecast.iloc[0]
        return {
            "forecast_month": future_date.strftime("%Y-%m-%d"),
            "predicted_revenue": max(0, float(row["yhat"])),
            "lower_bound": max(0, float(row["yhat_lower"])),
            "upper_bound": max(0, float(row["yhat_upper"])),
        }
    except Exception as e:
        import logging

        logging.getLogger(__name__).error(f"Prophet forecast failed: {e}")
        return None
