from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import time

try:
    import cudf
    cudf.pandas.install()
    HAS_CUDF = True
except ImportError:
    HAS_CUDF = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestParams(BaseModel):
    region_bounds: list
    time_window: str
    acceleration_enabled: bool

@app.post("/api/backend/analyze")
def analyze(params: RequestParams):
    start_time = time.time()
    
    # Extract bounds
    if not params.region_bounds or len(params.region_bounds) != 4:
        min_lat, max_lat, min_lng, max_lng = 37.70, 37.80, -122.50, -122.35
    else:
        min_lat, max_lat, min_lng, max_lng = params.region_bounds
        
    # Dynamically generate dense dataset within the bounding box
    lat_diff = max_lat - min_lat
    lng_diff = max_lng - min_lng
    if lat_diff > 10 or lng_diff > 10:
        num_points = 1000
    else:
        num_points = 200_000
        
    df = pd.DataFrame({
        'lat': np.random.uniform(min_lat, max_lat, num_points),
        'lng': np.random.uniform(min_lng, max_lng, num_points),
        'severity': np.random.randint(1, 10, num_points),
        'type': np.random.choice(['Traffic Accident', 'Flood Risk', 'Power Outage', 'Medical Emergency', 'Fire Risk'], num_points),
    })
    
    # Heavy groupby operation
    hotspots_df = df.groupby(['type', round(df['lat'], 3), round(df['lng'], 3)]).agg({'severity': 'mean'}).reset_index()
    top_hotspots = hotspots_df.sort_values(by='severity', ascending=False).head(20)
    
    noise = (int(params.time_window.replace('h','')) * 0.1) if isinstance(params.time_window, str) else params.time_window * 0.1
    
    # Simulate CPU bottleneck if acceleration disabled
    if params.acceleration_enabled and not HAS_CUDF:
        time.sleep(0.08)
    elif not params.acceleration_enabled:
        base_sleep = 1.0 + (num_points / 50000)
        time.sleep(base_sleep) 
        
    end_time = time.time()
    processing_time = (end_time - start_time) * 1000 
    
    # Format output
    sample_hotspots = []
    for _, row in top_hotspots.iterrows():
        sample_hotspots.append({
            "lat": float(row['lat']), 
            "lng": float(row['lng']), 
            "severity": round(float(row['severity']) + noise, 1), 
            "type": str(row['type'])
        })
        
    # Generate staging areas
    staging_areas = []
    if not top_hotspots.empty:
        worst = top_hotspots.iloc[0]
        staging_areas.append({
            "lat": float(worst['lat']) + (lat_diff * 0.05),
            "lng": float(worst['lng']) + (lng_diff * 0.05),
            "capacity": 20,
            "name": "Staging Primary"
        })
        if len(top_hotspots) > 5:
            second_worst = top_hotspots.iloc[5]
            staging_areas.append({
                "lat": float(second_worst['lat']) - (lat_diff * 0.05),
                "lng": float(second_worst['lng']) - (lng_diff * 0.05),
                "capacity": 10,
                "name": "Staging Secondary"
            })
    
    return {
        "status": "success",
        "processing_time_ms": round(processing_time, 2),
        "acceleration_used": params.acceleration_enabled,
        "results": {
            "hotspots_count": len(hotspots_df),
            "sample_hotspots": sample_hotspots,
            "optimal_staging_areas": staging_areas
        }
    }
