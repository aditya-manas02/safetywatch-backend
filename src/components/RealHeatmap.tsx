// src/components/RealHeatmap.tsx
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const API_BASE = "http://localhost:4000/api";

export default function RealHeatmap() {
  const [map, setMap] = useState<L.Map | null>(null);
  const [heatLayer, setHeatLayer] = useState<any>(null);

  useEffect(() => {
    // Prevent rendering before container exists
    const container = document.getElementById("real-heatmap");
    if (!container) return;

    // If map already exists (React strict mode), clean the existing one
    if (map) return;

    const newMap = L.map("real-heatmap", {
      center: [31.25, 75.70],
      zoom: 12,
      zoomControl: false,
      preferCanvas: true,
    });

    // Add base map layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    setMap(newMap);

    return () => {
      newMap.remove(); // 🔥 Clean up map on unmount
    };
  }, []);

  // Load heatmap points
  useEffect(() => {
    if (!map) return;

    async function loadHeatPoints() {
      try {
        const res = await fetch(`${API_BASE}/incidents/coords/all`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) return;

        const heatPoints = data
          .filter((i) => i.latitude && i.longitude)
          .map((i) => [i.latitude, i.longitude, 0.5]);

        // Remove old heat layer
        if (heatLayer) {
          map.removeLayer(heatLayer);
        }

        // Add new heat layer
        // @ts-ignore leaflet.heat has no TS types
        const newHeatLayer = L.heatLayer(heatPoints, {
          radius: 35,
          blur: 20,
          maxZoom: 15,
          max: 1.0,
        }).addTo(map);

        setHeatLayer(newHeatLayer);
      } catch (err) {
        console.error("Heatmap load error:", err);
      }
    }

    loadHeatPoints();
  }, [map]);

  return (
    <div
      id="real-heatmap"
      className="
        w-full 
        h-64 
        rounded-lg 
        shadow 
        border 
        overflow-hidden 
        relative 
        z-0
      "
      style={{
        position: "relative", // 🔥 prevents layering over modal
      }}
    ></div>
  );
}
