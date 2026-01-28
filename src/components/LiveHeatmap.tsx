import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export default function LiveHeatmap() {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current) return; // prevent reinit

    // Initialize map
    mapRef.current = L.map("heatmap-container", {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: false,
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(mapRef.current);

    loadHeatmap();
  }, []);

  async function loadHeatmap() {
    try {
      const res = await fetch("http://localhost:4000/api/incidents/coords/all");
      const data = await res.json();

      const heatPoints = data.map((p: any) => [p.latitude, p.longitude, 0.8]);

      // Add heat layer
      // @ts-ignore
      L.heatLayer(heatPoints, {
        radius: 28,
        blur: 20,
        maxZoom: 17,
      }).addTo(mapRef.current);
    } catch (err) {
      console.error("Heatmap load error:", err);
    }
  }

  return (
    <div
      id="heatmap-container"
      style={{ height: "300px", width: "100%", borderRadius: "10px", overflow: "hidden" }}
      className="shadow"
    />
  );
}
