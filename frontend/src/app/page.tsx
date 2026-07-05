'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Activity, ShieldAlert, Navigation, Database, 
  Cpu, Zap, TrendingUp, Clock, Map as MapIcon, RefreshCw, BarChart2, Globe
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

// Dynamically import the map to prevent SSR issues with Leaflet
const InteractiveMap = dynamic(() => import('../components/MapComponent'), { ssr: false, loading: () => <div className="loader"></div> });

const LOCATIONS = [
  { name: 'San Francisco', coords: [37.7749, -122.4194] as [number, number] },
  { name: 'New York', coords: [40.7128, -74.0060] as [number, number] },
  { name: 'London', coords: [51.5074, -0.1278] as [number, number] },
  { name: 'Tokyo', coords: [35.6762, 139.6503] as [number, number] },
  { name: 'Sydney', coords: [-33.8688, 151.2093] as [number, number] },
];

export default function RescueIntelDashboard() {
  const [activeTab, setActiveTab] = useState('Map');
  const [showToast, setShowToast] = useState('');
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(LOCATIONS[0].coords);
  const [accelerationEnabled, setAccelerationEnabled] = useState(true);
  const [timeWindow, setTimeWindow] = useState(12);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  
  const [stats, setStats] = useState({
    processingTime: 0,
    hotspotsCount: 0,
    sampleHotspots: [] as any[],
    stagingAreas: [] as any[],
    chartData: [] as any[]
  });

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(''), 3000);
  };

  const fetchAnalysis = useCallback(async (accel: boolean, timeVal: number, bounds: [number, number, number, number] | null) => {
    setIsProcessing(true);
    try {
      let res;
      try {
         const response = await fetch('/api/backend/analyze', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             region_bounds: bounds,
             time_window: `${timeVal}h`,
             acceleration_enabled: accel
           })
         });
         res = await response.json();
      } catch (e) {
         // Fallback mock if backend is disconnected
         const simProcessingTime = accel ? 80 + Math.random()*25 : 3000 + Math.random()*500;
         await new Promise(r => setTimeout(r, accel ? 120 : 3000));
         
         const centerLat = bounds ? (bounds[0] + bounds[1])/2 : mapCenter[0];
         const centerLng = bounds ? (bounds[2] + bounds[3])/2 : mapCenter[1];

         res = {
            processing_time_ms: simProcessingTime,
            results: {
               hotspots_count: Math.floor(Math.random() * 800) + 200,
               sampleHotspots: [
                 { lat: centerLat + (Math.random() - 0.5)*0.08, lng: centerLng + (Math.random() - 0.5)*0.08, severity: 9.1 + Math.random(), type: "Critical Weather Event" },
                 { lat: centerLat + (Math.random() - 0.5)*0.08, lng: centerLng + (Math.random() - 0.5)*0.08, severity: 8.4 + Math.random(), type: "Multi-Vehicle Collision" },
                 { lat: centerLat + (Math.random() - 0.5)*0.08, lng: centerLng + (Math.random() - 0.5)*0.08, severity: 7.8 + Math.random(), type: "Power Grid Failure" }
               ],
               optimal_staging_areas: [
                 { lat: centerLat, lng: centerLng, capacity: 25, name: "Staging Command Alpha" }
               ]
            }
         };
      }

      // Generate dynamic chart data
      const newChartData = Array.from({ length: 7 }).map((_, i) => ({
         time: `+${i * 4}h`,
         volume: Math.floor(res.results.hotspots_count * (0.5 + Math.random() * 0.8))
      }));

      setStats({
        processingTime: res.processing_time_ms,
        hotspotsCount: res.results.hotspots_count,
        sampleHotspots: res.results.sample_hotspots || res.results.sampleHotspots || [],
        stagingAreas: res.results.optimal_staging_areas || [],
        chartData: newChartData
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [mapCenter]);

  const handleBoundsChange = useCallback((bounds: [number, number, number, number]) => {
    setCurrentBounds(bounds);
    fetchAnalysis(accelerationEnabled, timeWindow, bounds);
  }, [accelerationEnabled, timeWindow, fetchAnalysis]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTimeWindow(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchAnalysis(accelerationEnabled, val, currentBounds);
    }, 300);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        if (currentBounds && !isProcessing && activeTab === 'Map') {
            fetchAnalysis(accelerationEnabled, timeWindow, currentBounds);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [isLive, currentBounds, accelerationEnabled, timeWindow, fetchAnalysis, isProcessing, activeTab]);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-green)', color: 'white', padding: '12px 24px', 
          borderRadius: '8px', zIndex: 9999, fontWeight: 600, boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
          animation: 'fadein 0.3s'
        }}>
          {showToast}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar glass-panel" style={{ border: 'none', borderRadius: 0, width: '320px' }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={28} color="#3b82f6" />
            RescueIntel
          </h2>
          <p className="glow-text" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Global Emergency Dispatch
          </p>
        </div>

        <div className="nav-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
          <div className={`nav-item ${activeTab === 'Map' ? 'active' : ''}`} onClick={() => setActiveTab('Map')}>
             <MapIcon size={20} /> Live Map View
          </div>
          <div className={`nav-item ${activeTab === 'Data' ? 'active' : ''}`} onClick={() => { setActiveTab('Data'); triggerToast('Connecting to Data Warehouse...'); }}>
             <Database size={20} /> Data Intelligence
          </div>
          <div className={`nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('Analytics'); triggerToast('Loading Predictive Models...'); }}>
             <TrendingUp size={20} /> Response Analytics
          </div>
          <div className={`nav-item ${activeTab === 'Logs' ? 'active' : ''}`} onClick={() => { setActiveTab('Logs'); triggerToast('Fetching Secure Logs...'); }}>
             <ShieldAlert size={20} /> Incident Logs
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Location Selector */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={14} /> Global Operations
             </label>
             <select 
                style={{ 
                   width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', 
                   color: 'white', border: '1px solid var(--border-light)', outline: 'none'
                }}
                onChange={(e) => {
                   const loc = LOCATIONS.find(l => l.name === e.target.value);
                   if (loc) {
                      setMapCenter(loc.coords);
                      setActiveTab('Map'); // Force back to map to see it
                      triggerToast(`Redirecting Satellites to ${loc.name}...`);
                   }
                }}
             >
                {LOCATIONS.map(loc => (
                   <option key={loc.name} value={loc.name} style={{ background: '#0f111a' }}>{loc.name}</option>
                ))}
             </select>
          </div>

          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
               <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Live Data Feed</h3>
               <div className="switch-container" onClick={() => setIsLive(!isLive)}>
                  <div className={`switch ${isLive ? 'active' : ''}`} style={{ width: '36px', height: '18px' }}>
                    <div className="switch-handle" style={{ width: '14px', height: '14px', top: '2px', left: isLive ? '20px' : '2px' }}></div>
                  </div>
               </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: isLive ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {isLive ? '● Polling global datastream...' : 'Paused'}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Cpu size={20} color={accelerationEnabled ? "var(--accent-green)" : "var(--text-muted)"} />
              <h3 style={{ fontSize: '1rem' }}>Hardware Acceleration</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Toggle NVIDIA RAPIDS GPU processing.
            </p>
            <div className="switch-container" onClick={() => setAccelerationEnabled(!accelerationEnabled)}>
              <div className={`switch ${accelerationEnabled ? 'active' : ''}`}>
                <div className="switch-handle"></div>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: accelerationEnabled ? 'var(--accent-green)' : 'white' }}>
                {accelerationEnabled ? 'RAPIDS Active' : 'CPU Mode'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{ fontSize: '2.2rem' }}>Command Center</h1>
            <p style={{ color: 'var(--text-muted)' }}>Dynamic View • Filtering 10B+ Global Records</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn" onClick={() => fetchAnalysis(accelerationEnabled, timeWindow, currentBounds)}>
              <RefreshCw size={18} className={isProcessing ? "loader" : ""} style={isProcessing ? { border: 'none', borderTop: 'none', animation: 'spin 1s linear infinite' } : {}} />
              {isProcessing ? 'Calculating...' : 'Force Refresh'}
            </button>
            <button className="btn" style={{ background: 'var(--accent-green)' }} onClick={() => triggerToast('✓ Staging units deployed to optimal locations.')}>
              <Navigation size={18} />
              Deploy Units
            </button>
          </div>
        </header>

        {activeTab !== 'Map' ? (
           <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <Database size={48} color="var(--accent-blue)" style={{ opacity: 0.5 }} />
              <h2 style={{ color: 'var(--text-muted)' }}>{activeTab} Module Loading...</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Secure connection established. Awaiting payload.</p>
           </div>
        ) : (
          <div className="dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Main Map Area */}
              <div className="map-container glass-panel" style={{ height: '520px', background: 'transparent' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
                   <InteractiveMap 
                      hotspots={stats.sampleHotspots} 
                      stagingAreas={stats.stagingAreas} 
                      center={mapCenter}
                      onBoundsChange={handleBoundsChange} 
                   />
                </div>
                
                <div className="map-overlay" style={{ pointerEvents: 'none', zIndex: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     <div className="glass-panel" style={{ padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 17, 26, 0.85)' }}>
                       {isProcessing ? <div className="loader"></div> : <Zap size={20} color={accelerationEnabled ? "var(--accent-green)" : "var(--accent-red)"} />}
                       <span style={{ fontWeight: 600 }}>
                          {isProcessing 
                             ? 'Processing geographical data...' 
                             : (accelerationEnabled ? 'Instant GPU Calculation' : 'CPU Bottleneck Detected')}
                       </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Timeline Control */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} color="var(--accent-blue)" />
                    Predictive Timeline (Next 24h)
                  </h3>
                  <span className="glow-text" style={{ fontWeight: 700 }}>
                    {new Date(Date.now() + timeWindow * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" max="24" 
                  value={timeWindow} 
                  onChange={handleSliderChange}
                  className="timeline-slider" 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Current</span>
                  <span>+12 Hours</span>
                  <span>+24 Hours</span>
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="side-panel">
              <div className="metric-card glass-panel" style={
                !accelerationEnabled 
                ? { border: '1px solid var(--accent-red)', background: 'rgba(239, 68, 68, 0.1)' } 
                : { border: '1px solid var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)' }
              }>
                <div className="metric-header">
                  <Zap size={18} />
                  Latency (Dynamic Bounds)
                </div>
                <div className="metric-value">
                  {stats.processingTime.toFixed(0)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ms</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: !accelerationEnabled ? 'var(--accent-red)' : 'var(--accent-green)', marginTop: '8px' }}>
                  {!accelerationEnabled ? '⚠️ Warning: Dispatch delayed' : '✓ Real-time insight ready'}
                </p>
              </div>

              <div className="metric-card glass-panel" style={{ paddingBottom: '8px' }}>
                <div className="metric-header">
                  <BarChart2 size={18} />
                  Predicted Volume
                </div>
                <div style={{ height: '100px', width: '100%', marginTop: '16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="volume" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVolume)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Top Critical Risks</h3>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {stats.sampleHotspots.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No critical risks in current viewport.</p>
                  )}
                  {stats.sampleHotspots.map((h, i) => (
                    <div key={i} className="list-item" style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="list-item-title">{h.type || 'High Risk Zone'}</span>
                        <span style={{ 
                          background: h.severity > 8 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: h.severity > 8 ? 'var(--accent-red)' : '#f59e0b',
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600
                        }}>
                          {h.severity.toFixed(1)}/10
                        </span>
                      </div>
                      <span className="list-item-desc">Location: {h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                    </div>
                  ))}
                  
                  {stats.stagingAreas.length > 0 && <h4 style={{ marginTop: '24px', marginBottom: '8px', color: 'var(--text-muted)' }}>Recommended Staging</h4>}
                  {stats.stagingAreas.map((s, i) => (
                    <div key={'s'+i} className="list-item" style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: '12px', background: 'rgba(59, 130, 246, 0.05)' }}>
                      <span className="list-item-title">{s.name}</span>
                      <span className="list-item-desc">Capacity: {s.capacity} units</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
