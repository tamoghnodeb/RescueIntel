'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for staging areas
const stagingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  hotspots: any[];
  stagingAreas: any[];
  center: [number, number];
  onBoundsChange: (bounds: [number, number, number, number]) => void;
}

// Component to handle map events
function MapEvents({ onBoundsChange }: { onBoundsChange: (b: [number, number, number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange([
        bounds.getSouth(),
        bounds.getNorth(),
        bounds.getWest(),
        bounds.getEast()
      ]);
    }
  });
  
  // Trigger initial bounds once
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        const bounds = map.getBounds();
        onBoundsChange([
        bounds.getSouth(),
        bounds.getNorth(),
        bounds.getWest(),
        bounds.getEast()
        ]);
    }
  }, [map, onBoundsChange]);

  return null;
}

// Component to fly to new center
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 12, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function InteractiveMap({ hotspots, stagingAreas, center, onBoundsChange }: MapProps) {
  return (
    <MapContainer 
      center={center} 
      zoom={12} 
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      className="z-0"
    >
      <MapController center={center} />
      
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <MapEvents onBoundsChange={onBoundsChange} />

      {/* Render Hotspots */}
      {hotspots.map((h, i) => (
        <CircleMarker 
          key={`hotspot-${i}-${h.lat}-${h.lng}`} 
          center={[h.lat, h.lng]}
          radius={h.severity * 2}
          pathOptions={{ 
            color: h.severity > 8 ? '#ef4444' : '#f59e0b', 
            fillColor: h.severity > 8 ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.6,
            weight: 2
          }}
        >
          <Popup>
            <div style={{ color: '#0f111a' }}>
              <strong>{h.type}</strong><br/>
              Severity: {h.severity.toFixed(1)}/10
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Render Staging Areas */}
      {stagingAreas.map((s, i) => (
        <Marker 
          key={`staging-${i}-${s.lat}`} 
          position={[s.lat, s.lng]}
          icon={stagingIcon}
        >
          <Popup>
            <div style={{ color: '#0f111a' }}>
              <strong>{s.name}</strong><br/>
              Capacity: {s.capacity} units
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
