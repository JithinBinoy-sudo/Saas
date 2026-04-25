"""
ARIMA-based forecasting model.
Used when >= 24 months of data are available for stronger autocorrelation capture.
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from dateutil.relativedelta import relativedelta


def run_arima_forecast(points: list[dict]) -> list[dict] | None:
    """
    Fit ARIMA on the given monthly data points and return a multi-month forecast.

    Args:
        points: List of {"ds": "YYYY-MM-DD", "y": float} sorted by date.

    Returns:
        List of dicts with forecast_month, predicted_revenue, lower_bound, upper_bound
        or None if fitting fails.
    """
    try:
        df = pd.DataFrame(points)
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float).clip(lower=0)
        df = df.sort_values("ds").reset_index(drop=True)

        # Set as time series with monthly frequency
        ts = df.set_index("ds")["y"]
        ts.index = pd.DatetimeIndex(ts.index).to_period("M").to_timestamp()

        # Fit ARIMA(1,1,1) — a reasonable default for monthly revenue data
        # Could use auto_arima from pmdarima for optimal order, but keeping it simple
        model = ARIMA(ts, order=(1, 1, 1))
        fitted = model.fit()

        # Forecast 1 step ahead with confidence intervals
        steps = 1
        forecast_result = fitted.get_forecast(steps=steps)
        forecast_mean = forecast_result.predicted_mean
        conf_int = forecast_result.conf_int(alpha=0.2)  # 80% confidence

        last_date = df["ds"].max()
        results: list[dict] = []
        for i in range(steps):
            future_date = last_date + relativedelta(months=i + 1)
            lower = float(conf_int.iloc[i, 0])
            upper = float(conf_int.iloc[i, 1])
            results.append(
                {
                    "forecast_month": future_date.strftime("%Y-%m-%d"),
                    "predicted_revenue": max(0, float(forecast_mean.iloc[i])),
                    "lower_bound": max(0, lower),
                    "upper_bound": max(0, upper),
                }
            )
        return results
    except Exception as e:
        import logging

        logging.getLogger(__name__).error(f"ARIMA forecast failed: {e}")
        return None
