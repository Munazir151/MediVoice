'use client';

import { useEffect, useId, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import type { ClinicDirectoryItem } from '@/lib/clinic-directory';

type NearbyClinicMapProps = {
  userLocation: { lat: number; lng: number };
  clinics: Array<ClinicDirectoryItem & { distanceKm: number }>;
  onBookAppointment?: (clinic: ClinicDirectoryItem & { distanceKm: number }) => void;
};

const userIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-user-marker',
});

export default function NearbyClinicMap({ userLocation, clinics, onBookAppointment }: NearbyClinicMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mapInstanceId = useId();

  useEffect(() => {
    setIsMounted(true);

    L.Icon.Default.mergeOptions({
      iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  if (!isMounted) {
    return <div className="h-[320px] w-full rounded-xl border border-white/10 bg-white/5" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <MapContainer
        key={mapInstanceId}
        center={[userLocation.lat, userLocation.lng]}
        zoom={12}
        style={{ height: '320px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>Your current location</Popup>
        </Marker>

        {clinics.map((clinic) => (
          <Marker key={clinic.id} position={[clinic.lat, clinic.lng]}>
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm">{clinic.name}</p>
                <p>Specialty: {clinic.specialty}</p>
                <p>Distance: {clinic.distanceKm.toFixed(2)} km</p>
                <p>Address: {clinic.address}</p>
                {clinic.schemesAccepted.length > 0 ? (
                  <p>Schemes: {clinic.schemesAccepted.join(', ')}</p>
                ) : (
                  <p>
                    Schemes: <span className="font-semibold text-amber-600">Scheme not verified</span>
                  </p>
                )}
                {onBookAppointment && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onBookAppointment(clinic)}
                      className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      Book appointment
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
