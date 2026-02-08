import { motion } from "framer-motion";
import { Activity, Shield, Zap, Globe, Users, Clock, AlertTriangle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type SignalClass = "ALPHA" | "SIGMA" | "PULSE" | "INTEL";

interface Signal {
    class: SignalClass;
    location: string;
    text: string;
    timestamp?: Date;
    priority: number;
}

const SafetyPulse = () => {
    const [stats, setStats] = useState({
        incidentsToday: 0,
        safeScore: 100,
        activeUsers: 0
    });
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [latestIncidents, setLatestIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPulse = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
                const API_BASE = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

                const VERSION_HEADERS = { "x-app-version": "1.4.2" };

                // 1. Fetch Stats & Pulse
                const [pulseRes, statsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/stats/pulse`, { headers: VERSION_HEADERS }),
                    fetch(`${API_BASE}/api/stats/public`, { headers: VERSION_HEADERS })
                ]);

                if (pulseRes.ok && statsRes.ok) {
                    const pulseData = await pulseRes.json();
                    const statsData = await statsRes.json();
                    setStats({
                        incidentsToday: pulseData.incidentsToday || 0,
                        safeScore: pulseData.safetyScore || 100,
                        activeUsers: statsData.activeUsers || 0
                    });
                }

                // 2. Fetch Real Announcements
                const annRes = await fetch(`${API_BASE}/api/notifications/public`, { headers: VERSION_HEADERS });
                if (annRes.ok) {
                    const data = await annRes.json();
                    setAnnouncements((data || []).filter((a: any) =>
                        !a.title.toLowerCase().includes("tell me about yourself")
                    ));
                }

                // 3. Fetch Latest Incidents
                const incRes = await fetch(`${API_BASE}/api/incidents/latest`, { headers: VERSION_HEADERS });
                if (incRes.ok) {
                    const data = await incRes.json();
                    setLatestIncidents(data || []);
                }
            } catch (err) {
                console.error("Failed to fetch pulse intelligence", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPulse();
        const interval = setInterval(fetchPulse, 45000); // 45s refresh for higher fidelity
        return () => clearInterval(interval);
    }, []);

    const signals = useMemo(() => {
        const list: Signal[] = [];

        // ALPHA: Critical/Recent Incidents
        latestIncidents.forEach(inc => {
            list.push({
                class: "ALPHA",
                location: inc.location.split(',')[0].toUpperCase(),
                text: `${inc.type.toUpperCase()}: ${inc.title}`,
                timestamp: new Date(inc.createdAt),
                priority: 1
            });
        });

        // INTEL: Official Announcements
        announcements.forEach(ann => {
            list.push({
                class: "INTEL",
                location: "COMMAND",
                text: ann.message,
                priority: 2
            });
        });

        // SIGMA: System Metrics
        list.push({
            class: "SIGMA",
            location: "NETWORK",
            text: `Safety Score: ${stats.safeScore}% | Nodes Synchronized | Status: OPTIMAL`,
            priority: 3
        });

        // PULSE: Live Community Heatbeat
        list.push({
            class: "PULSE",
            location: "GUARDIANS",
            text: `${stats.activeUsers} Guardians actively patrolling sectors.`,
            priority: 4
        });

        // Fallback Tips if low data
        if (list.length < 5) {
            list.push({
                class: "SIGMA",
                location: "SECURITY",
                text: "Encrypted peer-to-peer verification protocols active (AES-256).",
                priority: 5
            });
            list.push({
                class: "PULSE",
                location: "INFO",
                text: "Verify all surroundings before reporting. Accuracy saves lives.",
                priority: 6
            });
        }

        return list.sort((a, b) => a.priority - b.priority);
    }, [latestIncidents, announcements, stats]);

    const getSignalStyle = (cls: SignalClass) => {
        switch (cls) {
            case "ALPHA": return "bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
            case "INTEL": return "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]";
            case "SIGMA": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            case "PULSE": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
            default: return "bg-muted text-muted-foreground border-border";
        }
    };

    const getSignalIcon = (cls: SignalClass) => {
        switch (cls) {
            case "ALPHA": return <AlertTriangle className="h-3 w-3" />;
            case "INTEL": return <Shield className="h-3 w-3" />;
            case "SIGMA": return <Zap className="h-3 w-3" />;
            case "PULSE": return <Users className="h-3 w-3" />;
            default: return <Activity className="h-3 w-3" />;
        }
    };

    return (
        <div className="w-full bg-background/95 text-foreground backdrop-blur-3xl border-b border-border overflow-hidden py-2 relative z-30 transition-colors duration-500 shadow-sm">
            <div className="container mx-auto flex items-center gap-6">
                {/* Master Badge */}
                <div className="flex items-center gap-2.5 px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap border border-primary/20 shadow-[0_0_20px_rgba(255,107,0,0.1)] bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="relative">
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                        <div className="absolute inset-0 bg-primary/20 blur-md animate-pulse" />
                    </div>
                    Intelligence Feed
                </div>

                {/* Animated Intelligence Flow */}
                <div className="flex-1 overflow-hidden relative">
                    <motion.div
                        className="flex items-center gap-16 whitespace-nowrap pl-4"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{
                            duration: 60, // Slower, calmer movement
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        {/* Combine original and duplicate for seamless loop */}
                        {[...signals, ...signals].map((sig, idx) => (
                            <div key={idx} className="flex items-center gap-4 group cursor-default">
                                <div className={cn(
                                    "flex items-center gap-2 px-2 py-0.5 rounded-md border text-[9px] font-black tracking-widest transition-all group-hover:scale-105 hover:shadow-lg",
                                    getSignalStyle(sig.class)
                                )}>
                                    {getSignalIcon(sig.class)}
                                    {sig.class}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider">{sig.location}</span>
                                        {sig.timestamp && (
                                            <span className="text-[9px] font-bold text-primary/40 flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" />
                                                {formatDistanceToNow(sig.timestamp, { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                        {sig.text}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SafetyPulse;
