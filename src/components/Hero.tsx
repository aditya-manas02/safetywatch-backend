import { useEffect, useState } from "react";
import { Activity, Map } from "lucide-react";

export default function Hero({
  onReportClick,
  onViewReports,   // ⭐ Added callback for scrolling
}: any) {
  const [stats, setStats] = useState<any>(null);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // ⭐ Correct backend public stats endpoint
      const statsRes = await fetch("http://localhost:4000/api/stats/public");
      const statsJson = await statsRes.json();

      const latestRes = await fetch("http://localhost:4000/api/incidents/latest");
      const latestJson = await latestRes.json();

      setStats(statsJson);
      setLatest(latestJson);
    } catch (err) {
      console.log("Hero Load Error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container mx-auto flex flex-col lg:flex-row items-center py-20 px-6 gap-10">

      {/* LEFT SIDE */}
      <div className="flex-1">
        <p className="inline-block px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-sm mb-4">
          Community Safety Platform
        </p>

        <h1 className="text-5xl font-black leading-tight mb-6">
          Keep your neighborhood <span className="text-blue-600">safe</span> & informed
        </h1>

        <p className="text-lg text-gray-600 mb-6">
          Report incidents, receive alerts, and collaborate with your community.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onReportClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            Report an Incident
          </button>

          <button
            onClick={onViewReports}          // ⭐ FIX — now scrolls!
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            View Recent Reports
          </button>
        </div>
      </div>

      {/* RIGHT SIDE — LIVE CARD */}
      <div className="flex-1">
        <div className="rounded-2xl shadow-xl border border-white/30 p-8 bg-gradient-to-br from-blue-50 to-cyan-50">

          <h4 className="text-center text-xs text-gray-500 tracking-widest mb-3">
            LIVE OVERVIEW
          </h4>

          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-3 text-center mb-6">
                <div>
                  <p className="text-3xl font-bold text-blue-700">
                    {stats?.totalIncidents ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>

                <div>
                  <p className="text-3xl font-bold text-amber-600">
                    {stats?.pending ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>

                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.approved ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Approved</p>
                </div>
              </div>

              {/* Heatmap Preview */}
              <div className="bg-white rounded-xl h-28 flex items-center justify-center border mb-6">
                <Map className="h-8 w-8 text-blue-600" />
                <p className="ml-3 text-sm text-gray-600">Community heatmap preview</p>
              </div>

              {/* Recent Activity */}
              <h5 className="text-xs text-gray-500 tracking-widest mb-2">
                RECENT ACTIVITY
              </h5>

              <ul className="space-y-2">
                {latest.map((inc) => (
                  <li
                    key={inc._id}
                    className="flex items-center gap-3 bg-white p-3 rounded-lg border"
                  >
                    <Activity className="text-blue-600 h-4 w-4" />
                    <div>
                      <p className="font-medium text-sm">{inc.title}</p>
                      <p className="text-xs text-gray-500">
                        {inc.type} • {inc.location}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

    </section>
  );
}
