// src/components/HeatmapPreview.tsx
import React from "react";

/**
 * Minimal mock heatmap preview component.
 * If you later add a real map (Leaflet/Mapbox), replace this block.
 */
export default function HeatmapPreview() {
  return (
    <div className="rounded-md overflow-hidden border">
      {/* simple SVG / CSS mock heatmap */}
      <div className="h-48 bg-gradient-to-br from-yellow-50 via-red-50 to-blue-50 relative">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            <radialGradient id="g1" cx="20%" cy="30%" r="30%">
              <stop offset="0%" stopColor="#ff8a65" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff8a65" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g2" cx="70%" cy="60%" r="28%">
              <stop offset="0%" stopColor="#ffd54f" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffd54f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g3" cx="45%" cy="40%" r="20%">
              <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill="transparent" />
          <circle cx="80" cy="50" r="60" fill="url(#g1)" />
          <circle cx="260" cy="120" r="70" fill="url(#g2)" />
          <circle cx="170" cy="85" r="50" fill="url(#g3)" />
        </svg>
      </div>

      <div className="p-3 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Mock heatmap</div>
            <div className="text-xs text-slate-500">Preview of incident density (demo)</div>
          </div>
          <div className="text-xs text-slate-400">Updated just now</div>
        </div>
      </div>
    </div>
  );
}
