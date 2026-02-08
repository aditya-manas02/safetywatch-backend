import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export default function LiveHeatmap() {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map("heatmap-container", {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(mapRef.current);

    async function loadHeatmap() {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
        const res = await fetch(`${baseUrl}/api/incidents/coords/all`);
        const data = await res.json();

        const heatPoints = data.map((p: { latitude: number; longitude: number }) => [p.latitude, p.longitude, 0.8]);

        // @ts-expect-error - L.heatLayer is added by leafet.heat plugin and not in base types
        L.heatLayer(heatPoints, {
          radius: 28,
          blur: 20,
          maxZoom: 17,
        }).addTo(mapRef.current);
      } catch (err) {
        console.error("Heatmap load error:", err);
      }
    }

    loadHeatmap();
  }, []);

  return (
    <div
      id="heatmap-container"
      style={{ height: "300px", width: "100%", borderRadius: "10px", overflow: "hidden" }}
      className="shadow"
    />
  );
}
