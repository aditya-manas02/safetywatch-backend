import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Users, Activity, AlertCircle } from "lucide-react";
import { DashboardSkeleton } from "./Skeletons";

import { motion } from "framer-motion";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface DashboardStatsData {
  totalIncidents: number;
  pending: number;
  totalUsers: number;
  incidentsThisWeek: number;
  mostCommonType: string;
  incidentsToday: number;
  approved: number;
  incidentsByDay: { date: string; count: number }[];
  typeDistribution: { name: string; value: number }[];
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const chartTheme = {
    grid: isDark ? "#1e293b" : "#e2e8f0",
    text: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#0f172a" : "#ffffff",
    tooltipBorder: isDark ? "#1e293b" : "#e2e8f0"
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
        const res = await fetch(`${baseUrl}/api/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to fetch stats");
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

  if (loading) return <DashboardSkeleton />;

  if (!stats) return <div className="p-6 text-center text-destructive">Error loading stats. Please check backend.</div>;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Total Incidents", value: stats.totalIncidents, icon: <Shield className="h-5 w-5 text-blue-500" />, desc: "Across all categories", color: "blue" },
          { label: "Pending Reports", value: stats.pending, icon: <AlertCircle className="h-5 w-5 text-amber-500" />, desc: "Awaiting moderation", color: "amber", pulse: stats.pending > 0 },
          { label: "Total Citizens", value: stats.totalUsers, icon: <Users className="h-5 w-5 text-emerald-500" />, desc: "Verified accounts", color: "emerald" },
          { label: "Weekly Growth", value: stats.incidentsThisWeek, icon: <Activity className="h-5 w-5 text-purple-500" />, desc: "New reports this week", color: "purple" }
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
          >
            <StatCard {...item as any} />
          </motion.div>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* INCIDENT TRENDS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="bg-card border-border shadow-xl backdrop-blur-sm border-opacity-50 overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Incident Trends</CardTitle>
                  <p className="text-sm text-muted-foreground">Activity volume over the last 7 days</p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="h-[250px] md:h-[300px] pt-4 pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.isArray(stats?.incidentsByDay) ? stats.incidentsByDay : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={chartTheme.text}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={chartTheme.text}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: "12px",
                      color: isDark ? "#fff" : "#000"
                    }}
                    itemStyle={{ color: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: chartTheme.tooltipBg }}
                    activeDot={{ r: 6, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* CATEGORY DISTRIBUTION */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card className="bg-card border-border shadow-xl backdrop-blur-sm border-opacity-50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Category Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Breakdown by incident type</p>
            </CardHeader>
            <CardContent className="h-[250px] md:h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Array.isArray(stats?.typeDistribution) ? stats.typeDistribution : []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(Array.isArray(stats?.typeDistribution) ? stats.typeDistribution : []).map((_entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: "12px",
                      color: isDark ? "#fff" : "#000"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* DETAILED INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[
          { title: "Most Frequent", val: stats.mostCommonType, sub: "Requires focus area attention" },
          { title: "Today", val: `${stats.incidentsToday} Reports`, sub: "Real-time incoming alerts" },
          { title: "Efficiency", val: `${stats.totalIncidents > 0 ? Math.round((stats.approved / stats.totalIncidents) * 100) : 0}% Approval`, sub: "Verified community content rate" }
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + idx * 0.1, duration: 0.5 }}
            className="p-6 rounded-2xl bg-muted/30 border border-border backdrop-blur-sm"
          >
            <h4 className="text-primary font-bold mb-2">{item.title}</h4>
            <p className="text-xl md:text-2xl font-black capitalize text-foreground">{item.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  color: "blue" | "amber" | "emerald" | "purple";
  pulse?: boolean;
}

function StatCard({ label, value, icon, description, color, pulse }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-600 to-blue-400 shadow-blue-500/20",
    amber: "from-amber-600 to-amber-400 shadow-amber-500/20",
    emerald: "from-emerald-600 to-emerald-400 shadow-emerald-500/20",
    purple: "from-purple-600 to-purple-400 shadow-purple-500/20",
  };

  return (
    <div className={`bg-card/50 backdrop-blur-md border border-border p-6 rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-all duration-300 ${pulse ? 'ring-2 ring-rose-500/50' : ''}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${colorMap[color]} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <span className="text-3xl font-black tracking-tighter text-foreground">{value ?? 0}</span>
      </div>
      <p className="text-sm font-bold text-foreground mb-1 relative z-10">{label}</p>
      <p className="text-xs text-muted-foreground font-medium relative z-10">{description}</p>

      {/* Decorative background glow */}
      <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-tr ${colorMap[color]} opacity-10 dark:opacity-5 blur-2xl group-hover:opacity-20 dark:group-hover:opacity-10 transition-opacity`} />
    </div>
  );
}
