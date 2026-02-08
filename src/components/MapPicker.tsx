import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "./ui/button";
import { Navigation } from "lucide-react";
import { toast } from "sonner";

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number } | null;
  readonly?: boolean;
}

function LocationButton({ onSelect, setPosition }: {
  onSelect: (lat: number, lng: number) => void;
  setPosition: (pos: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const toastId = toast.loading("Fetching location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };
        setPosition(newPos);
        onSelect(latitude, longitude);
        map.setView(newPos, 16);
        toast.success("Location updated", { id: toastId });
      },
      (err) => {
        console.error(err);
        let msg = "Could not get location";
        if (err.code === 1) msg = "Location permission denied";
        toast.error(msg, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleLocate}
        className="shadow-md bg-white hover:bg-gray-100 text-primary border border-primary/20 font-bold px-4 py-2"
      >
        <Navigation className="h-4 w-4 mr-2" />
        Use My Location
      </Button>
    </div>
  );
}

export default function MapPicker({ onSelect, initialPosition, readonly }: MapPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(initialPosition || null);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (readonly) return;
        setPosition(e.latlng);
        onSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const center = initialPosition || { lat: 28.6139, lng: 77.2090 };

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-border shadow-inner relative">
      <MapContainer
        center={center}
        zoom={initialPosition ? 16 : 13}
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {!readonly && <MapEvents />}
        {!readonly && <LocationButton onSelect={onSelect} setPosition={setPosition} />}
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
