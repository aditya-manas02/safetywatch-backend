import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
}

export default function MapPicker({ onSelect }: MapPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden">
      <MapContainer
        center={{ lat: 28.6139, lng: 77.2090 }} // Default: Delhi
        zoom={12}
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
