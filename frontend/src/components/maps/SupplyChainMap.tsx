'use client'

import { MapContainer, TileLayer, Popup, Polyline, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

// Warehouse locations (real Indian cities)
const WAREHOUSES = [
  { name: 'Mumbai WH', lat: 19.076, lng: 72.8777, stock: 82, status: 'optimal' as const },
  { name: 'Delhi WH', lat: 28.7041, lng: 77.1025, stock: 45, status: 'low' as const },
  { name: 'Chennai WH', lat: 13.0827, lng: 80.2707, stock: 91, status: 'optimal' as const },
  { name: 'Kolkata WH', lat: 22.5726, lng: 88.3639, stock: 23, status: 'critical' as const },
  { name: 'Pune WH', lat: 18.5204, lng: 73.8567, stock: 67, status: 'optimal' as const },
  { name: 'Bangalore WH', lat: 12.9716, lng: 77.5946, stock: 78, status: 'optimal' as const },
]

// Active shipment routes
const ROUTES: { from: [number, number]; to: [number, number]; status: 'on-time' | 'delayed' }[] = [
  { from: [19.076, 72.8777], to: [28.7041, 77.1025], status: 'on-time' },
  { from: [13.0827, 80.2707], to: [22.5726, 88.3639], status: 'delayed' },
  { from: [18.5204, 73.8567], to: [12.9716, 77.5946], status: 'on-time' },
  { from: [28.7041, 77.1025], to: [22.5726, 88.3639], status: 'delayed' },
  { from: [12.9716, 77.5946], to: [13.0827, 80.2707], status: 'on-time' },
]

const STATUS_COLORS = {
  optimal: '#10B981',
  low: '#F59E0B',
  critical: '#EF4444',
} as const

interface SupplyChainMapProps {
  /** Show shipment routes */
  showRoutes?: boolean
  /** Map height */
  height?: string
  /** Map zoom level */
  zoom?: number
}

export default function SupplyChainMap({
  showRoutes = true,
  height = '100%',
  zoom = 5,
}: SupplyChainMapProps) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '8px', minHeight: '280px' }}
      className="dark-map"
      scrollWheelZoom={true}
      zoomControl={true}
    >
      {/* Use CartoDB dark tiles for better visual match */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {/* Warehouse markers */}
      {WAREHOUSES.map((wh) => (
        <CircleMarker
          key={wh.name}
          center={[wh.lat, wh.lng]}
          radius={10}
          fillColor={STATUS_COLORS[wh.status]}
          color="rgba(255,255,255,0.6)"
          weight={2}
          fillOpacity={0.85}
        >
          <Popup>
            <div style={{ color: '#1E293B', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ fontSize: 14 }}>{wh.name}</strong>
              <br />
              Stock Level:{' '}
              <span style={{ fontWeight: 700, color: STATUS_COLORS[wh.status] }}>
                {wh.stock}%
              </span>
              <br />
              Status:{' '}
              <span
                style={{
                  fontWeight: 600,
                  color: STATUS_COLORS[wh.status],
                  textTransform: 'uppercase',
                  fontSize: 11,
                }}
              >
                {wh.status}
              </span>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Shipment routes */}
      {showRoutes &&
        ROUTES.map((route, i) => (
          <Polyline
            key={`route-${i}`}
            positions={[route.from, route.to]}
            color={route.status === 'on-time' ? '#3B8EE8' : '#EF4444'}
            weight={2}
            opacity={0.7}
            dashArray={route.status === 'delayed' ? '8,12' : undefined}
          />
        ))}
    </MapContainer>
  )
}
