import { useState, useEffect } from "react";
import { Loader2, Flag, User, MessageSquare, AlertTriangle, ShieldCheck, ShieldAlert, Clock, CheckCircle2, MoreVertical, Ban, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Report {
    _id: string;
    reporterId: { _id: string; name: string; email: string };
    reportedUserId: { _id: string; name: string; email: string };
    incidentId: { _id: string; title: string };
    messageId?: { _id: string; content: string };
    reason: string;
    status: "pending" | "reviewed" | "resolved";
    adminAction: "none" | "warned" | "suspended";
    createdAt: string;
}

export default function ReportManager() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<"warn" | "suspend" | "dismiss">("warn");
    const [actionReason, setActionReason] = useState("");
    const [suspensionDays, setSuspensionDays] = useState("7");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    const token = localStorage.getItem("token");

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/incidents/admin/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (err) {
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleAction = async () => {
        if (!selectedReport) return;
        if (actionType !== "dismiss" && !actionReason.trim()) {
            toast.error("Please provide a reason for the action.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${baseUrl}/api/incidents/admin/reports/${selectedReport._id}/action`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: actionType,
                    reason: actionReason,
                    suspensionDays: actionType === "suspend" ? suspensionDays : undefined
                })
            });

            if (res.ok) {
                toast.success(`Action '${actionType}' applied successfully`);
                setIsActionModalOpen(false);
                setActionReason("");
                fetchReports();
            } else {
                toast.error("Failed to apply action");
            }
        } catch (err) {
            toast.error("Error applying action");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openActionModal = (report: Report, type: "warn" | "suspend" | "dismiss") => {
        setSelectedReport(report);
        setActionType(type);
        setIsActionModalOpen(true);
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Flag className="h-5 w-5 text-primary" />
                        Report Queue
                    </h2>
                    <p className="text-xs text-muted-foreground font-semibold">User violations and moderation requests.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="h-8 rounded-lg px-3 flex items-center gap-1.5 border-amber-500/20 bg-amber-500/5 text-amber-500 font-bold">
                        <AlertTriangle className="h-3 w-3" /> {reports.filter(r => r.status === 'pending').length} Pending
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {reports.length === 0 ? (
                    <div className="bg-muted/10 border-2 border-dashed border-border/50 rounded-3xl p-12 text-center">
                        <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">Clear Frequency</h3>
                        <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">No citizen violations reported at this time.</p>
                    </div>
                ) : (
                    reports.map((report) => (
                        <div key={report._id} className="bg-background/40 backdrop-blur-md border border-border/50 rounded-3xl p-5 hover:border-primary/30 transition-all group overflow-hidden relative">
                            {report.status === 'resolved' && (
                                <div className="absolute top-0 right-0 p-3">
                                    <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-none rounded-full">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> RESOLVED
                                    </Badge>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 relative">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                                            <Flag className="h-5 w-5 text-rose-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-black tracking-tight text-foreground uppercase">Violation Incident</h4>
                                                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {new Date(report.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-rose-500 mb-2 truncate max-w-md bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 inline-block">
                                                REASON: {report.reason}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-3 bg-muted/20 rounded-2xl border border-border/30">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <User className="h-3 w-3" /> Reported User
                                            </p>
                                            <p className="text-sm font-black truncate">{report.reportedUserId?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate opacity-70">{report.reportedUserId?.email || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-muted/20 rounded-2xl border border-border/30">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <ShieldAlert className="h-3 w-3" /> Reporter
                                            </p>
                                            <p className="text-sm font-black truncate">{report.reporterId?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate opacity-70">{report.reporterId?.email || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-muted/20 rounded-2xl border border-border/30">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <Info className="h-3 w-3" /> Context
                                            </p>
                                            <p className="text-sm font-black truncate">Incident: {report.incidentId?.title || 'Unknown'}</p>
                                            {report.messageId && (
                                                <p className="text-[10px] text-muted-foreground italic truncate">" {report.messageId.content} "</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {report.status === 'pending' && (
                                    <div className="flex flex-row md:flex-col gap-2 justify-end shrink-0 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
                                        <Button
                                            size="sm"
                                            onClick={() => openActionModal(report, "warn")}
                                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-lg shadow-amber-500/20"
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Warn
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => openActionModal(report, "suspend")}
                                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-lg shadow-rose-500/20"
                                        >
                                            <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openActionModal(report, "dismiss")}
                                            className="h-8 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-muted rounded-lg"
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Admin Action Modal */}
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            {actionType === "warn" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                            {actionType === "suspend" && <Ban className="h-5 w-5 text-rose-500" />}
                            {actionType === "dismiss" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                            Admin Action: {actionType.toUpperCase()}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground">
                            {actionType === "dismiss"
                                ? "No violation found. This report will be closed without action."
                                : `Take disciplinary action against citizen ${selectedReport?.reportedUserId.name}.`}
                        </DialogDescription>
                    </DialogHeader>

                    {actionType !== "dismiss" && (
                        <div className="space-y-6 py-4">
                            {actionType === "suspend" && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Suspension Duration (Days)</Label>
                                    <Input
                                        type="number"
                                        value={suspensionDays}
                                        onChange={(e) => setSuspensionDays(e.target.value)}
                                        className="bg-muted/30 border-border/50 rounded-xl h-11 focus-visible:ring-rose-500/20"
                                        placeholder="0 for indefinite"
                                    />
                                    <p className="text-[10px] text-muted-foreground font-bold italic opacity-60">Citizen will be locked out of the system for this duration.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Reason / Internal Note</Label>
                                <Textarea
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    placeholder="Enter reasoning for this action..."
                                    className="bg-muted/30 border-border/50 rounded-2xl min-h-[100px] text-sm focus-visible:ring-primary/20"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 p-2">
                        <Button variant="ghost" onClick={() => setIsActionModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button
                            onClick={handleAction}
                            disabled={isSubmitting || (actionType !== "dismiss" && !actionReason.trim())}
                            className={cn(
                                "rounded-xl px-6 font-black shadow-lg shadow-black/10 uppercase tracking-widest text-xs h-11 transition-all active:scale-95",
                                actionType === "warn" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" :
                                    actionType === "suspend" ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" :
                                        "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Action"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
