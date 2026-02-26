import { useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Leaflet with Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface GeofenceMapProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
  height?: string;
}

function MapCenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useMemo(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

export function GeofenceMap({ center, radiusMeters, userLocation, className, height = '250px' }: GeofenceMapProps) {
  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={17}
        className="h-full w-full rounded-lg z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter center={center} />
        <Circle center={[center.lat, center.lng]} radius={radiusMeters} pathOptions={{ color: '#1e3a8a', fillOpacity: 0.1, weight: 2 }} />
        <Marker position={[center.lat, center.lng]} />
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} />}
      </MapContainer>
    </div>
  );
}
