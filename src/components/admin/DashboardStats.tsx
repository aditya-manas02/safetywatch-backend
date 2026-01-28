import { useEffect, useState } from "react";

export default function DashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:4000/api/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const d = await res.json();
        setStats(d);
      } catch (err) {
        console.error("Stats Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading stats...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

      {/* Total Incidents */}
      <Card label="Total Incidents" value={stats.totalIncidents} color="text-blue-400" />

      {/* Pending */}
      <Card label="Pending" value={stats.pending} color="text-yellow-400" />

      {/* Approved */}
      <Card label="Approved" value={stats.approved} color="text-green-400" />

      {/* Rejected */}
      <Card label="Rejected" value={stats.rejected} color="text-red-400" />

      {/* Total Users */}
      <Card label="Total Users" value={stats.totalUsers} color="text-cyan-400" />

      {/* Active Users (last 7 days) */}
      <Card label="Active Users (7 days)" value={stats.activeUsers} color="text-purple-400" />

      {/* Incidents This Week */}
      <Card label="Incidents This Week" value={stats.incidentsThisWeek} color="text-orange-400" />

      {/* Incidents Today */}
      <Card label="Incidents Today" value={stats.incidentsToday} color="text-pink-400" />

      {/* Most Common Incident Type */}
      <Card label="Most Common Type" value={stats.mostCommonType} color="text-white" />

    </div>
  );
}

function Card({ label, value, color }: any) {
  return (
    <div className="bg-[#071328] border border-gray-800 p-6 rounded-lg shadow-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
    </div>
  );
}
