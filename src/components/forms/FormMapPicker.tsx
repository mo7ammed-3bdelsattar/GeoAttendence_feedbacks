import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../utils/cn.ts';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface FormMapPickerProps {
  label?: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  onCenterChange?: (lat: number, lng: number) => void;
  onRadiusChange?: (meters: number) => void;
  className?: string;
  height?: string;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function FormMapPicker({
  label,
  center,
  radiusMeters,
  onCenterChange,
  onRadiusChange,
  className,
  height = '200px',
}: FormMapPickerProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={17}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={(lat, lng) => onCenterChange?.(lat, lng)} />
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusMeters}
            pathOptions={{ color: '#1e3a8a', fillOpacity: 0.15, weight: 2 }}
          />
          <Marker position={[center.lat, center.lng]} icon={defaultIcon} />
        </MapContainer>
      </div>
      {onRadiusChange && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">Geofence radius (m):</span>
          <input
            type="range"
            min={20}
            max={150}
            value={radiusMeters}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none bg-gray-200"
          />
          <span className="text-sm font-medium w-10">{radiusMeters}</span>
        </div>
      )}
    </div>
  );
}
