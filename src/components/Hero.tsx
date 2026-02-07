import { useEffect, useState } from "react";
import { Activity, Map } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: "easeOut",
    });

    return controls.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export default function Hero({
  onReportClick,
  onViewReports,
}: any) {
  const [stats, setStats] = useState<any>(null);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
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
    <section className="hero-bg">
      <div className="container mx-auto flex flex-col lg:flex-row items-center py-28 px-6 gap-16">

        {/* LEFT SIDE */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm mb-6">
            Community Safety Platform
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            Keep your neighborhood{" "}
            <span className="text-blue-600">safe</span>
            <br />
            and <span className="text-blue-600">informed</span>
          </h1>

          <p className="text-lg text-gray-600 mb-10 max-w-xl">
            Report incidents, receive alerts, and collaborate with your
            community in real time — all from one trusted platform.
          </p>

          <div className="flex flex-wrap gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={onReportClick}
              className="cta-primary px-9 py-4 bg-blue-600 text-white rounded-full text-base font-semibold"
            >
              Report an Incident
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onViewReports}
              className="px-9 py-4 rounded-full border border-gray-300 bg-white text-gray-700"
            >
              View Recent Reports
            </motion.button>
          </div>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="dashboard-panel p-10">

            <p className="text-center text-xs tracking-widest text-gray-500 mb-8">
              LIVE OVERVIEW
            </p>

            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : (
              <>
                {/* 🔢 ANIMATED STATS */}
                <div className="grid grid-cols-3 text-center mb-10">
                  <div>
                    <p className="text-4xl font-extrabold text-blue-600">
                      <AnimatedCounter value={stats?.totalIncidents ?? 0} />
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>

                  <div>
                    <p className="text-4xl font-extrabold text-amber-500">
                      <AnimatedCounter value={stats?.pending ?? 0} />
                    </p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>

                  <div>
                    <p className="text-4xl font-extrabold text-green-600">
                      <AnimatedCounter value={stats?.approved ?? 0} />
                    </p>
                    <p className="text-xs text-gray-500">Approved</p>
                  </div>
                </div>

                {/* HEATMAP PREVIEW */}
                <div className="bg-white rounded-xl h-28 flex items-center justify-center border mb-8">
                  <Map className="h-8 w-8 text-blue-600" />
                  <p className="ml-3 text-sm text-gray-600">
                    Community heatmap preview
                  </p>
                </div>

                {/* RECENT ACTIVITY */}
                <p className="text-xs tracking-widest text-gray-500 mb-4">
                  RECENT ACTIVITY
                </p>

                <ul className="space-y-3">
                  {latest.map((inc) => (
                    <li
                      key={inc._id}
                      className="flex items-center gap-3 bg-white p-4 rounded-xl border"
                    >
                      <Activity className="text-blue-600 h-4 w-4" />
                      <div>
                        <p className="font-semibold text-sm">{inc.title}</p>
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
        </motion.div>
      </div>
    </section>
  );
}
