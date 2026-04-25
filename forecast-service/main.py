"""
Portlio Forecast Service — FastAPI app
Accepts historical monthly revenue data, fits Prophet or ARIMA,
and writes forecast results back to Supabase.
"""

import os
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import numpy as np

from models.ets_model import run_ets_forecast

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Portlio Forecast Service", version="1.0.0")

# CORS — allow calls from your Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase env vars not set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class DataPoint(BaseModel):
    ds: str  # 'YYYY-MM-DD'
    y: float
    listing_id: str


class ForecastRequest(BaseModel):
    company_id: str
    data: list[DataPoint]
    as_of_month: Optional[str] = None


class ForecastResult(BaseModel):
    listing_id: str
    forecast_month: str
    predicted_revenue: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    model_used: str


class ForecastResponse(BaseModel):
    forecasts: list[ForecastResult]
    warnings: list[str] = []


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    """
    Accepts historical monthly revenue data per listing,
    fits Prophet or ARIMA based on data length,
    writes results to Supabase, and returns them.
    """
    if not req.data:
        raise HTTPException(status_code=400, detail="No data provided")

    # Group data by listing_id
    listings: dict[str, list[dict]] = {}
    for dp in req.data:
        listings.setdefault(dp.listing_id, []).append({"ds": dp.ds, "y": dp.y})

    all_forecasts: list[ForecastResult] = []
    db_rows: list[dict] = []
    warnings: list[str] = []

    for listing_id, points in listings.items():
        # Sort by date
        points.sort(key=lambda x: x["ds"])
        n_months = len(points)
        as_of_month = req.as_of_month or (points[-1]["ds"] if points else None)

        if n_months < 3:
            warnings.append(
                f"{listing_id}: Only {n_months} months of data — skipping forecast"
            )
            continue

        # ETS is a strong default for short monthly series and 1-step forecasts.
        model_name = "ets"
        logger.info(f"{listing_id}: Using ETS ({n_months} months)")
        result = run_ets_forecast(points)
        if not result:
            warnings.append(f"{listing_id}: ETS fit failed — skipping forecast")

        if result:
            results = result if isinstance(result, list) else [result]
            for item in results:
                forecast_item = ForecastResult(
                    listing_id=listing_id,
                    forecast_month=item["forecast_month"],
                    predicted_revenue=round(item["predicted_revenue"], 2),
                    lower_bound=(
                        round(item["lower_bound"], 2)
                        if item.get("lower_bound") is not None
                        else None
                    ),
                    upper_bound=(
                        round(item["upper_bound"], 2)
                        if item.get("upper_bound") is not None
                        else None
                    ),
                    model_used=model_name,
                )
                all_forecasts.append(forecast_item)
                db_rows.append(
                    {
                        "company_id": req.company_id,
                        "listing_id": listing_id,
                        "as_of_month": as_of_month,
                        "forecast_month": forecast_item.forecast_month,
                        "predicted_revenue": forecast_item.predicted_revenue,
                        "lower_bound": forecast_item.lower_bound,
                        "upper_bound": forecast_item.upper_bound,
                        "model_used": forecast_item.model_used,
                        "generated_at": datetime.utcnow().isoformat(),
                    }
                )

    # Write to Supabase
    if db_rows:
        try:
            supabase = get_supabase()
            supabase.table("revenue_forecasts").upsert(db_rows).execute()
            logger.info(f"Wrote {len(db_rows)} forecast rows to Supabase")
        except Exception as e:
            logger.error(f"Failed to write forecasts to Supabase: {e}")
            warnings.append(f"DB write failed: {str(e)}")

    return ForecastResponse(forecasts=all_forecasts, warnings=warnings)
