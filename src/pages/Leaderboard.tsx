
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
    Shield,
    Trophy,
    Medal,
    Crown,
    Target,
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    Star,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
    _id: string;
    reportCount: number;
    name: string;
    profilePicture?: string;
    memberSince: string;
}

export default function Leaderboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [userRank, setUserRank] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sectorName, setSectorName] = useState("Sector History");
    const [viewMode, setViewMode] = useState<"local" | "global">("local");

    const fetchLeaderboard = async (lat?: number, lng?: number) => {
        try {
            setLoading(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
            const API_BASE = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

            let url = `${API_BASE}/api/stats/leaderboard`;
            const params = new URLSearchParams();

            if (user?.id) params.append("userId", user.id);

            if (viewMode === "local" && (lat || location?.lat)) {
                params.append("lat", (lat || location?.lat).toString());
                params.append("lng", (lng || location?.lng).toString());
                params.append("radius", "10");
            }

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch leaderboard");

            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
            setUserRank(data.userRank || null);
        } catch (err) {
            console.error(err);
            toast({
                title: "System Error",
                description: "Could not establish connection to the ranking database.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === "global") {
            fetchLeaderboard();
            return;
        }

        // Local mode: Get real-time location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });

                    try {
                        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                        const geoData = await geoRes.json();
                        setSectorName(geoData.locality || geoData.city || "Your Sector");
                    } catch (e) {
                        setSectorName("Local Sector");
                    }

                    fetchLeaderboard(latitude, longitude);
                },
                (error) => {
                    console.error("Location access denied:", error);
                    setSectorName("Global Sector");
                    setViewMode("global");
                    fetchLeaderboard();
                },
                { enableHighAccuracy: true }
            );
        } else {
            setSectorName("Global Sector");
            setViewMode("global");
            fetchLeaderboard();
        }
    }, [viewMode]);

    const getRankBadge = (index: number) => {
        switch (index) {
            case 0: return <Crown className="h-6 w-6 text-yellow-400 fill-yellow-400" />;
            case 1: return <Medal className="h-6 w-6 text-slate-300 fill-slate-300" />;
            case 2: return <Medal className="h-6 w-6 text-amber-600 fill-amber-600" />;
            default: return <span className="text-xl font-black text-muted-foreground/40">#{index + 1}</span>;
        }
    };

    const getStatusLabel = (count: number) => {
        if (count >= 50) return "Nexus Overlord";
        if (count >= 20) return "Master Defender";
        if (count >= 10) return "Sentinel Prime";
        if (count >= 5) return "Vanguard Elite";
        return "Neighborhood Guardian";
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-background text-foreground p-4 md:p-8 lg:p-12 pb-24 relative overflow-hidden"
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[150px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -ml-4"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dossier
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                <Trophy className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black tracking-tight uppercase">Guardian Elite</h1>
                                <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {viewMode === "local" ? `Sector: ${sectorName} • 10km Radius` : "Global Defense Network"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex p-1.5 bg-muted/50 backdrop-blur-md rounded-2xl border border-border/50 self-end">
                            <button
                                onClick={() => setViewMode("local")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300",
                                    viewMode === "local" ? "bg-primary text-primary-foreground shadow-xl scale-100" : "text-muted-foreground hover:text-foreground scale-95"
                                )}
                            >
                                Local Sector
                            </button>
                            <button
                                onClick={() => setViewMode("global")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300",
                                    viewMode === "global" ? "bg-primary text-primary-foreground shadow-xl scale-100" : "text-muted-foreground hover:text-foreground scale-95"
                                )}
                            >
                                Global Network
                            </button>
                        </div>

                        <Card className="bg-muted/30 border-border/50 backdrop-blur-xl rounded-2xl p-4 border shadow-2xl">
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        {viewMode === "local" ? "Nearby Defense Active" : "Total Network Assets"}
                                    </p>
                                    <div className="flex items-center gap-2 justify-end">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span className="text-xl font-black">{leaderboard.length || "0"} Active Guardians</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground font-black uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence>
                            {leaderboard.map((guardian, index) => (
                                <motion.div
                                    key={guardian._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className={cn(
                                        "group relative overflow-hidden transition-all duration-500 hover:scale-[1.01] border-none shadow-2xl",
                                        index === 0 ? "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-card border-l-4 border-yellow-500" :
                                            index === 1 ? "bg-gradient-to-r from-slate-300/10 via-slate-300/5 to-card border-l-4 border-slate-300" :
                                                index === 2 ? "bg-gradient-to-r from-amber-600/10 via-amber-600/5 to-card border-l-4 border-amber-600" :
                                                    "bg-card hover:bg-muted/50"
                                    )}>
                                        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-12 flex justify-center">
                                                    {getRankBadge(index)}
                                                </div>

                                                <div className="relative">
                                                    <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-border/50 shadow-2xl">
                                                        {guardian.profilePicture ? (
                                                            <img src={guardian.profilePicture} alt={guardian.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xl font-black text-primary">
                                                                {guardian.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {index < 3 && (
                                                        <div className="absolute -top-2 -right-2 p-1.5 rounded-lg bg-background border border-border/50 shadow-xl">
                                                            <Star className={cn(
                                                                "h-3 w-3",
                                                                index === 0 ? "text-yellow-400" : index === 1 ? "text-slate-300" : "text-amber-600"
                                                            )} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-xl font-black tracking-tight">{guardian.name}</h3>
                                                        {guardian._id === user?.id && (
                                                            <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-2">YOU</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                                        {getStatusLabel(guardian.reportCount)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex w-full md:w-auto flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pl-16 md:pl-0">
                                                <div className="flex items-center gap-3">
                                                    <Target className="h-4 w-4 text-primary" />
                                                    <span className="text-2xl font-black tracking-tighter">
                                                        {guardian.reportCount}
                                                        <span className="text-[10px] text-muted-foreground ml-2 font-black uppercase tracking-widest">Signals</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                                                    <TrendingUp className="h-3 w-3" /> VERIFIED VIGILANCE
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {userRank && userRank.rank > 10 && (
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-4 px-6 py-2">
                                    <div className="h-[1px] flex-1 bg-border/50" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Your Tactical Position</span>
                                    <div className="h-[1px] flex-1 bg-border/50" />
                                </div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Card className="bg-primary/10 border-primary/20 shadow-2xl overflow-hidden relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                                        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-12 flex justify-center">
                                                    <span className="text-xl font-black text-primary">#{userRank.rank}</span>
                                                </div>

                                                <div className="relative">
                                                    <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl">
                                                        {userRank.profilePicture ? (
                                                            <img src={userRank.profilePicture} alt={userRank.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xl font-black text-primary">
                                                                {userRank.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-xl font-black tracking-tight">{userRank.name}</h3>
                                                        <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-2">YOU</Badge>
                                                    </div>
                                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                                        {getStatusLabel(userRank.reportCount)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-3">
                                                    <Target className="h-4 w-4 text-primary" />
                                                    <span className="text-2xl font-black tracking-tighter">
                                                        {userRank.reportCount}
                                                        <span className="text-[10px] text-muted-foreground ml-2 font-black uppercase tracking-widest">Signals</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                                                    <TrendingUp className="h-3 w-3" /> VERIFIED VIGILANCE
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        )}

                        {!loading && leaderboard.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <Shield className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest">
                                    {viewMode === "local"
                                        ? "No signals recorded within your 10km radius."
                                        : "No signals recorded in the global network."}
                                </p>
                                <p className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                                    {viewMode === "local"
                                        ? "Switch to Global Network to see top-tier rankings."
                                        : "Expand your activity to appear in rankings."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer info */}
                <div className="pt-10 flex flex-col items-center gap-4 text-center">
                    <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.3em] leading-relaxed max-w-lg">
                        Ranking is based on strictly verified atmospheric and neighborhood signals.
                        Maintain reporting integrity to advance in global defense status.
                    </p>
                    <div className="h-[1px] w-24 bg-border/20" />
                </div>
            </div>
        </motion.div>
    );
}
