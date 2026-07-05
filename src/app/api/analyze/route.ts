import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const params = await request.json();
  const startTime = performance.now();

  // Extract bounds
  let minLat = 37.70, maxLat = 37.80, minLng = -122.50, maxLng = -122.35;
  if (params.region_bounds && params.region_bounds.length === 4) {
    [minLat, maxLat, minLng, maxLng] = params.region_bounds;
  }

  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const numPoints = (latDiff > 10 || lngDiff > 10) ? 1000 : 200000;

  // Simulate heavy data processing
  // In production with NVIDIA RAPIDS (cudf.pandas), this would be GPU-accelerated
  const incidentTypes = ['Traffic Accident', 'Flood Risk', 'Power Outage', 'Medical Emergency', 'Fire Risk'];

  // Generate hotspot clusters using statistical aggregation
  const gridResolution = 0.003;
  const grid: Record<string, { lat: number; lng: number; totalSeverity: number; count: number; type: string }> = {};

  for (let i = 0; i < numPoints; i++) {
    const lat = minLat + Math.random() * latDiff;
    const lng = minLng + Math.random() * lngDiff;
    const severity = Math.floor(Math.random() * 9) + 1;
    const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    
    const gridKey = `${Math.round(lat / gridResolution) * gridResolution}_${Math.round(lng / gridResolution) * gridResolution}_${type}`;
    
    if (!grid[gridKey]) {
      grid[gridKey] = { lat: Math.round(lat / gridResolution) * gridResolution, lng: Math.round(lng / gridResolution) * gridResolution, totalSeverity: 0, count: 0, type };
    }
    grid[gridKey].totalSeverity += severity;
    grid[gridKey].count += 1;
  }

  // Sort by average severity and get top 20
  const hotspots = Object.values(grid)
    .map(h => ({ ...h, severity: h.totalSeverity / h.count }))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 20);

  const timeWindowHours = parseInt(params.time_window?.replace('h', '') || '0');
  const noise = timeWindowHours * 0.1;

  // Simulate acceleration difference
  if (!params.acceleration_enabled) {
    // Simulate CPU bottleneck with blocking delay
    const delay = 2500 + Math.random() * 500;
    await new Promise(r => setTimeout(r, delay));
  } else {
    // Simulate fast GPU response
    await new Promise(r => setTimeout(r, 50 + Math.random() * 30));
  }

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  // Format output
  const sampleHotspots = hotspots.map(h => ({
    lat: h.lat,
    lng: h.lng,
    severity: Math.round((h.severity + noise) * 10) / 10,
    type: h.type
  }));

  // Generate staging areas near worst hotspots
  const stagingAreas = [];
  if (hotspots.length > 0) {
    const worst = hotspots[0];
    stagingAreas.push({
      lat: worst.lat + latDiff * 0.05,
      lng: worst.lng + lngDiff * 0.05,
      capacity: 20,
      name: "Staging Primary"
    });
    if (hotspots.length > 5) {
      const secondWorst = hotspots[5];
      stagingAreas.push({
        lat: secondWorst.lat - latDiff * 0.05,
        lng: secondWorst.lng - lngDiff * 0.05,
        capacity: 10,
        name: "Staging Secondary"
      });
    }
  }

  return NextResponse.json({
    status: "success",
    processing_time_ms: Math.round(processingTime * 100) / 100,
    acceleration_used: params.acceleration_enabled,
    results: {
      hotspots_count: Object.keys(grid).length,
      sample_hotspots: sampleHotspots,
      optimal_staging_areas: stagingAreas
    }
  });
}
