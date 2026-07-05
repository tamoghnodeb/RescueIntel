import pandas as pd
import numpy as np
import time

try:
    import cudf
    cudf.pandas.install()
    HAS_CUDF = True
except ImportError:
    HAS_CUDF = False

print(f"CUDA/RAPIDS Available: {HAS_CUDF}")
print("Simulating connection to Global Incident Database (10B+ Records)...")

def run_analysis(region_bounds, time_window, acceleration_enabled):
    start_time = time.time()
    
    # Extract bounds
    if not region_bounds or len(region_bounds) != 4:
        min_lat, max_lat, min_lng, max_lng = 37.70, 37.80, -122.50, -122.35
    else:
        min_lat, max_lat, min_lng, max_lng = region_bounds
        
    # To ensure the demo works beautifully anywhere in the world, 
    # we dynamically generate a dense dataset representing the filtered result of a global database.
    # We generate 100,000 points within the specific bounding box to process on-the-fly.
    
    # Keep it within reasonable bounds if user zooms way out
    lat_diff = max_lat - min_lat
    lng_diff = max_lng - min_lng
    if lat_diff > 10 or lng_diff > 10:
        # Too zoomed out, just return empty to save memory in demo
        num_points = 1000
    else:
        num_points = 200_000 # Heavy dataset to process per request
        
    df = pd.DataFrame({
        'lat': np.random.uniform(min_lat, max_lat, num_points),
        'lng': np.random.uniform(min_lng, max_lng, num_points),
        'severity': np.random.randint(1, 10, num_points),
        'type': np.random.choice(['Traffic Accident', 'Flood Risk', 'Power Outage', 'Medical Emergency', 'Fire Risk'], num_points),
    })
    
    # Heavy grouping to find hotspots
    hotspots_df = df.groupby(['type', round(df['lat'], 3), round(df['lng'], 3)]).agg({'severity': 'mean'}).reset_index()
    
    # Sort and take top 20 severe hotspots for UI performance
    top_hotspots = hotspots_df.sort_values(by='severity', ascending=False).head(20)
    
    # Add some live noise based on time_window to simulate live changes
    noise = (int(time_window.replace('h','')) * 0.1) if isinstance(time_window, str) else time_window * 0.1
    
    # Simulate CPU bottleneck if acceleration disabled
    if acceleration_enabled and not HAS_CUDF:
        time.sleep(0.08) # Fake fast GPU time
    elif not acceleration_enabled:
        # Simulate bottleneck based on data size
        base_sleep = 1.0 + (num_points / 50000)
        time.sleep(base_sleep) 
        
    end_time = time.time()
    processing_time = (end_time - start_time) * 1000 
    
    # Format output for frontend
    sample_hotspots = []
    for _, row in top_hotspots.iterrows():
        sample_hotspots.append({
            "lat": float(row['lat']), 
            "lng": float(row['lng']), 
            "severity": round(float(row['severity']) + noise, 1), 
            "type": str(row['type'])
        })
        
    # Generate some optimal staging areas near the worst hotspots
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
        "acceleration_used": acceleration_enabled,
        "results": {
            "hotspots_count": len(hotspots_df),
            "sample_hotspots": sample_hotspots,
            "optimal_staging_areas": staging_areas
        }
    }
