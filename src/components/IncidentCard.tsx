import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Shield,
  Flame,
  Activity,
  UtilityPole,
  Car,
  Volume2,
  UserSearch,
  Info,
  Maximize2,
  ArrowRight,
  GanttChartSquare,
  ArrowLeft,
  X,
  MessageSquare,
  Lock,
  Send,
  CornerDownRight,
  ShieldCheck
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import IncidentChat from "./IncidentChat";

export interface Incident {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  location: string;
  timestamp: Date;
  imageUrl?: string | null;
  status?: "pending" | "under process" | "approved" | "rejected" | "problem solved";
  isImportant?: boolean;
  allowMessages?: boolean;
  replies?: Message[];
  [key: string]: any;
}

type MessageUser = { _id: string; name: string; profilePicture?: string };

interface Message {
  _id: string;
  senderId: MessageUser;
  receiverId?: string;
  content: string;
  createdAt: string;
  replies: {
    _id: string;
    senderId: MessageUser;
    content: string;
    createdAt: string;
  }[];
}

interface IncidentCardProps {
  incident: Incident;
  userLocation?: { lat: number; lng: number } | null;
  isCompact?: boolean;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onDialogStateChange?: (open: boolean) => void;
}

export function IncidentCard({
  incident,
  userLocation,
  isCompact = false,
  trigger,
  defaultOpen = false,
  onDialogStateChange
}: IncidentCardProps) {
  const { user, token } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(defaultOpen);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isAcknowledgeLoading, setIsAcknowledgeLoading] = useState(false);


  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
  const API_BASE = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/api";



  const handleConfirm = async () => {
    if (!user) {
      toast.error("Please sign in to acknowledge reports", {
        position: "top-center",
        className: "font-bold"
      });
      return;
    }

    setIsAcknowledgeLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
      const API_BASE = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/api";

      const res = await fetch(`${API_BASE}/api/incidents/${incident.id}/acknowledge`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to acknowledge");
      }

      setIsAcknowledged(true);
      toast.success("Acknowledgement Logged Successully", {
        description: "Your receipt has been securely recorded in the community audit log.",
        position: "top-center",
        className: "font-bold"
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Security Transmission Failed", {
        description: err.message || "Please check your connection and try again.",
        position: "top-center"
      });
    } finally {
      setIsAcknowledgeLoading(false);
    }
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "pending":
        return { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock, label: "Pending" };
      case "under process":
        return { color: "bg-sky-500/10 text-sky-500 border-sky-500/20", icon: Loader2, label: "Processing" };
      case "approved":
        return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, label: "Verified" };
      case "rejected":
        return { color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle, label: "Rejected" };
      case "problem solved":
        return { color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: CheckCircle2, label: "Resolved" };
      default:
        return { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: AlertTriangle, label: "Reviewing" };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case "theft":
      case "assault":
      case "harassment":
      case "vandalism":
      case "suspicious":
        return { icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/5" };
      case "fire":
        return { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/5" };
      case "medical":
        return { icon: Activity, color: "text-red-500", bgColor: "bg-red-500/5" };
      case "hazard":
        return { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-500/5" };
      case "traffic":
        return { icon: Car, color: "text-indigo-500", bgColor: "bg-indigo-500/5" };
      case "infrastructure":
        return { icon: UtilityPole, color: "text-cyan-500", bgColor: "bg-cyan-500/5" };
      case "nuisance":
        return { icon: Volume2, color: "text-slate-500", bgColor: "bg-slate-500/5" };
      case "missing":
        return { icon: UserSearch, color: "text-emerald-500", bgColor: "bg-emerald-500/5" };
      default:
        return { icon: Info, color: "text-primary", bgColor: "bg-primary/5" };
    }
  };

  const statusConfig = getStatusConfig(incident.status);
  const typeConfig = getTypeConfig(incident.type);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      setIsDialogOpen(open);
      onDialogStateChange?.(open);
    }}>
      <DialogTrigger asChild>
        {trigger ? (
          <div className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] outline-none">
            {trigger}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.4 }}
            className="h-full cursor-pointer group/card"
          >
            <Card className="relative h-full flex flex-col border border-border/50 shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden bg-card/50 backdrop-blur-3xl group rounded-[2rem]">
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent pointer-events-none" />

              {/* Header / Badges */}
              <div className="p-5 flex justify-between items-center relative z-10 w-full">
                <Badge variant="outline" className={cn("px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest border transition-colors duration-300", statusConfig.color)}>
                  <StatusIcon className={cn("h-3.5 w-3.5 mr-2", incident.status === "under process" && "animate-spin")} />
                  {statusConfig.label}
                </Badge>

                <div className="flex gap-2">
                  {incident.isImportant && (
                    <Badge className="bg-rose-600/90 text-white font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/20">
                      Priority
                    </Badge>
                  )}
                </div>
              </div>

              {/* Image Section */}
              <div className="px-5 pb-5">
                <div className="relative w-full h-52 overflow-hidden rounded-[1.5rem] bg-muted/30">
                  {incident.imageUrl ? (
                    <img
                      src={incident.imageUrl}
                      alt={incident.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <GanttChartSquare className="h-16 w-16" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <div className="flex items-center gap-2 text-white text-[10px] font-black tracking-widest uppercase">
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expand Report
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="px-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-2 rounded-xl border border-primary/5 shadow-inner", typeConfig.bgColor)}>
                    <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                    {incident.type}
                  </span>
                </div>

                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors duration-300 tracking-tight leading-tight mb-3">
                  {incident.title}
                </h3>

                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed font-medium mb-6 opacity-80">
                  {incident.description}
                </p>
              </div>

              {/* Footer Section */}
              <div className="mt-auto p-6 bg-primary/[0.02] border-t border-primary/5 grid grid-cols-1 gap-2.5">
                <div className="flex items-center text-[11px] font-bold text-muted-foreground/90 gap-3">
                  <MapPin className="h-3.5 w-3.5 text-primary/60" />
                  <span className="truncate">{incident.location}</span>
                </div>
                <div className="flex items-center text-[11px] font-bold text-muted-foreground/70 gap-3">
                  <Clock className="h-3.5 w-3.5 text-blue-500/50" />
                  <span>{incident.timestamp ? new Date(incident.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date N/A'}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden border-none bg-transparent shadow-none scale-up-center h-[90vh] md:h-[85vh] flex flex-col [&>button:last-child]:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full h-full flex flex-col md:flex-row bg-[#020817]/95 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* LEFT COLUMN: HERO IMAGE (Sticky on Desktop) */}
          <div className="relative w-full md:w-[45%] h-[250px] md:h-auto overflow-hidden group border-b md:border-b-0 md:border-r border-white/10">
            <img
              src={incident.imageUrl || "https://images.unsplash.com/photo-1501854140801-50d01698950b"}
              alt={incident.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent opacity-60"></div>

            {/* FLOATING DOSSIER BADGE */}
            <div className="absolute top-6 left-6 z-20">
              <Badge className="bg-white/10 backdrop-blur-xl border-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                INCIDENT DOSSIER
              </Badge>
            </div>

            {/* STATUS & PRIORITY OVERLAYS */}
            <div className="absolute bottom-6 left-6 flex flex-wrap gap-2 z-20">
              <Badge className={cn("px-3 py-1.5 rounded-lg border-none font-black text-[10px] tracking-widest", statusConfig.color)}>
                {statusConfig.label.toUpperCase()}
              </Badge>
              {incident.isImportant && (
                <Badge className="bg-rose-500/90 text-white px-3 py-1.5 rounded-lg border-none font-bold text-[10px] tracking-widest flex items-center gap-1 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <AlertTriangle className="h-3 w-3" /> URGENT
                </Badge>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SCROLLABLE CONTENT */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative min-h-0 bg-[#020817]/40">

            {/* STICKY HEADER PART */}
            <div className="p-8 pb-4 shrink-0 border-b border-white/5 bg-gradient-to-b from-[#020817] to-transparent flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("p-2.5 rounded-xl border border-white/10", typeConfig.color)}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">{incident.type}</span>
                </div>
                <DialogTitle className="text-2xl md:text-4xl font-black text-white leading-[1.1] tracking-tight">
                  {incident.title}
                </DialogTitle>
              </div>

              <div className="flex items-center gap-2 self-start pt-2">
                <DialogClose asChild>
                  <button className="h-11 w-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white transition-all shadow-xl group/close">
                    <X className="h-6 w-6 transition-transform group-hover/close:rotate-90" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* QUICK ACTIONS BAR */}
            {(incident.allowMessages !== false) && incident.status !== "problem solved" && (
              <div className="mx-8 mb-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('secure-chat')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 text-xs font-bold uppercase tracking-wider rounded-lg gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message Reporter
                </Button>
              </div>
            )}

            {/* SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 pb-32 custom-scrollbar">

              {/* PRIMARY INFO CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl group hover:bg-white/10 transition-all flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <MapPin className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Location Data</span>
                  </div>
                  <p className="text-sm font-bold text-slate-200 tracking-wide">{incident.location}</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl group hover:bg-white/10 transition-all flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/20">
                      <Calendar className="h-5 w-5 text-teal-400" />
                    </div>
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Temporal Stamp</span>
                  </div>
                  <p className="text-sm font-bold text-slate-200 tracking-wide">
                    {incident.timestamp ? new Date(incident.timestamp).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'Date Unavailable'}
                  </p>
                </div>
              </div>

              {/* DESCRIPTION SECTION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary/80 font-black text-[10px] uppercase tracking-[0.3em] pl-1">
                  <GanttChartSquare className="h-4 w-4" /> Comprehensive Summary
                </div>
                <div className="bg-white/5 border border-white/5 p-8 rounded-3xl italic leading-relaxed text-slate-300 text-lg shadow-inner selection:bg-primary/30">
                  "{incident.description || "Official report analysis pending for this entry."}"
                </div>
              </div>

              {/* MESSAGING SECTION */}
              {/* MESSAGING SECTION */}
              {(incident.allowMessages !== false) && user?.id !== incident.userId && (
                <div className="flex-1 mt-6 min-h-[350px] overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
                  <IncidentChat
                    incidentId={incident.id}
                    incidentOwnerId={incident.userId}
                    otherUserId={user?.id}
                    incidentTitle={incident.title}
                    isResolved={incident.status === "problem solved"}
                    className="h-full border-none rounded-none bg-[#0b101b]/50"
                  />
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-6">
                <Button
                  onClick={handleConfirm}
                  disabled={isAcknowledged || isAcknowledgeLoading}
                  className={cn(
                    "w-full h-18 rounded-2xl font-black text-sm tracking-widest relative overflow-hidden group transition-all duration-500",
                    isAcknowledged
                      ? "bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 cursor-default"
                      : "bg-primary hover:bg-primary/90 text-white shadow-[0_0_40px_rgba(59,130,246,0.2)]"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {isAcknowledgeLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      LOGGING SECURE RECEIPT...
                    </div>
                  ) : isAcknowledged ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5" />
                      RECEIPT LOGGED & AUTHENTICATED
                    </div>
                  ) : (
                    "CONFIRM RECEIPT & SECURE LOG"
                  )}
                </Button>
                <div className="flex flex-col items-center gap-2 mt-6 opacity-30">
                  <div className="h-[1px] w-24 bg-white/40" />
                  <p className="text-[9px] font-black tracking-[0.4em] text-white uppercase">
                    Authenticated Security Protocol
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog >
  );
};

export default IncidentCard;
