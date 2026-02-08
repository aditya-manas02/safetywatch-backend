import { useState, useEffect } from "react";
import { Loader2, Activity, Shield, User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { AuditLog } from "@/types";

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
                const token = localStorage.getItem("token");
                const res = await fetch(`${baseUrl}/api/users/audit/logs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) setLogs(await res.json());
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Retrieving security logs...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" /> Administrative Audit
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">Tracking all moderator and system-level actions</p>
                    </div>
                    <Shield className="h-8 w-8 text-slate-800" />
                </div>

                <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                            <AlertCircle className="h-12 w-12 text-slate-700 mx-auto" />
                            <p className="text-slate-500 font-medium tracking-tight">No administrative actions recorded yet.</p>
                        </div>
                    ) : (
                        logs.map((log: AuditLog) => (
                            <div key={log._id} className="p-5 hover:bg-muted/50 transition-colors group flex gap-4 items-start">
                                <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-foreground">
                                            <span className="text-primary">{log.adminName}</span>
                                            <span className="mx-2 text-muted-foreground font-normal">performed</span>
                                            <span className="text-foreground underline decoration-primary/30 underline-offset-4">{log.action}</span>
                                        </p>
                                        <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1.5 whitespace-nowrap">
                                            <Clock className="h-3 w-3" /> {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Target: {log.targetType}
                                        </span>
                                        {log.details && (
                                            <p className="text-xs text-muted-foreground truncate italic">"{log.details}"</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
