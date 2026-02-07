import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { motion } from "framer-motion";

const API_BASE = "http://localhost:4000/api";

export default function RealHeatmap() {
  const [map, setMap] = useState<L.Map | null>(null);
  const [heatLayer, setHeatLayer] = useState<any>(null);

  useEffect(() => {
    const container = document.getElementById("real-heatmap");
    if (!container || map) return;

    const newMap = L.map("real-heatmap", {
      center: [31.25, 75.70],
      zoom: 12,
      zoomControl: false,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    async function loadHeatPoints() {
      try {
        const res = await fetch(`${API_BASE}/incidents/coords/all`);
        const data = await res.json();

        const heatPoints = data
          .filter((i) => i.latitude && i.longitude)
          .map((i) => [i.latitude, i.longitude, 0.5]);

        if (heatLayer) map.removeLayer(heatLayer);

        // @ts-ignore
        const newHeatLayer = L.heatLayer(heatPoints, {
          radius: 35,
          blur: 20,
          maxZoom: 15,
        }).addTo(map);

        setHeatLayer(newHeatLayer);
      } catch (err) {
        console.error("Heatmap load error:", err);
      }
    }

    loadHeatPoints();
  }, [map]);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Pulse overlay */}
      <div className="absolute inset-0 rounded-lg bg-blue-500/10 animate-pulse pointer-events-none z-10" />

      <div
        id="real-heatmap"
        className="w-full h-64 rounded-lg shadow border overflow-hidden relative z-0"
      />
    </motion.div>
  );
}
