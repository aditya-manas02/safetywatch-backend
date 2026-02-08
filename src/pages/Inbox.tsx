import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import IncidentChat from "@/components/IncidentChat";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    MessageSquare,
    Search,
    ArrowLeft,
    Loader2,
    ShieldAlert,
    Lock,
    MapPin,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Archive,

    Filter,
    Check,
    RotateCcw,
    Trash2,
    AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Types ---
interface Conversation {
    _id: string; // Incident ID
    title: string;
    type: string;
    description: string;
    status: string;
    location: string; // "lat,lng" string
    updatedAt: string;
    userId: string | { _id: string; name?: string; profilePicture?: string };
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: { name: string; _id: string };
    };
    otherParty: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
}

export default function Inbox() {
    const { user, token, isAdmin } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // --- API ---
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    const API_BASE = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    const fetchConversations = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/incidents/user/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
                if (!isMobile && data.length > 0 && !selectedThreadId) {
                    // select first active if available
                    const firstActive = data.find((c: Conversation) => c.status !== 'problem solved');
                    const initialSelection = firstActive || data[0];
                    setSelectedThreadId(`${initialSelection._id}_${initialSelection.otherParty._id}`);
                }
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [token, isMobile]);

    // --- Logic ---
    const activeConversation = conversations.find(c => `${c._id}_${c.otherParty._id}` === selectedThreadId);

    const filteredConversations = conversations.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.type.toLowerCase().includes(searchTerm.toLowerCase());
        const isResolved = c.status === "problem solved" || c.status === "rejected";

        if (filter === "active") return matchesSearch && !isResolved;
        if (filter === "resolved") return matchesSearch && isResolved;
        return matchesSearch;
    });

    // --- Actions ---
    const handleUpdateStatus = async (status: string) => {
        if (!activeConversation || !token) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/api/incidents/${activeConversation._id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                // Update local state
                setConversations(prev => prev.map(c =>
                    c._id === activeConversation._id ? { ...c, status } : c
                ));
                toast.success(`Incident ${status === 'problem solved' ? 'resolved' : 'archived'} successfully`);
            } else {
                toast.error("Failed to update incident status");
            }
        } catch (err) {
            console.error("Failed to update status", err);
            toast.error("Network error updating status");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteChat = async (incidentId: string, otherUserId: string) => {
        if (!token) return;
        if (!confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;

        try {
            const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/messages/${otherUserId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("Chat deleted successfully");
                setConversations(prev => prev.filter(c => !(`${c._id}_${c.otherParty._id}` === `${incidentId}_${otherUserId}`)));
                if (selectedThreadId === `${incidentId}_${otherUserId}`) {
                    setSelectedThreadId(null);
                }
            } else {
                toast.error("Failed to delete chat");
            }
        } catch (err) {
            console.error("Delete chat error", err);
            toast.error("Error deleting chat");
        }
    };

    // --- Map Effect ---
    useEffect(() => {
        if (!activeConversation || !mapContainerRef.current) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        try {
            // Parse location "lat,lng" or fallback
            const locationStr = activeConversation.location || "31.25,75.70";
            const [latStr, lngStr] = locationStr.split(",");
            const lat = parseFloat(latStr) || 31.25; // Fallback lat
            const lng = parseFloat(lngStr) || 75.70; // Fallback lng

            const map = L.map(mapContainerRef.current, {
                center: [lat, lng],
                zoom: 14,
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
            });

            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // Add marker
            L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: "#ef4444",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            mapRef.current = map;
        } catch (e) {
            console.error("Map init error", e);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [selectedThreadId]);


    // --- Render ---
    return (
        <div className="h-[calc(100vh-64px)] bg-background flex flex-col md:flex-row overflow-hidden relative">
            {/* Background Ambient */}
            <div className="absolute inset-0 bg-background -z-10" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none -z-10" />

            {/* --- LEFT PANEL: LIST --- */}
            <div className={cn(
                "w-full md:w-[320px] lg:w-[380px] flex flex-col border-r bg-background/50 backdrop-blur-xl transition-all z-20",
                selectedThreadId && isMobile ? "hidden" : "flex"
            )}>
                {/* Header */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => navigate("/")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <MessageSquare className="h-4 w-4 text-white" />
                            </div>
                            Secure Inbox
                        </h1>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search channels..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-muted/50 border-input rounded-xl focus-visible:ring-primary/30 transition-all hover:bg-muted"
                        />
                    </div>

                    <Tabs defaultValue="all" value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="all" className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
                            <TabsTrigger value="active" className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Active</TabsTrigger>
                            <TabsTrigger value="resolved" className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Archived</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* List */}
                <ScrollArea className="flex-1 px-2">
                    <div className="space-y-1 pb-4">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-3 p-3 mx-2 rounded-xl animate-pulse">
                                    <div className="h-10 w-10 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-24 bg-muted rounded" />
                                        <div className="h-2 w-full bg-muted rounded" />
                                    </div>
                                </div>
                            ))
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40 px-6">
                                <Filter className="h-8 w-8 mb-3" />
                                <p className="text-sm font-bold">No active feeds found</p>
                                <p className="text-xs">Try adjusting your filters.</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <div
                                    key={`${conv._id}_${conv.otherParty._id}`}
                                    onClick={() => setSelectedThreadId(`${conv._id}_${conv.otherParty._id}`)}
                                    className={cn(
                                        "group flex gap-3 p-3 mx-2 rounded-2xl cursor-pointer border transition-all duration-200 relative overflow-hidden active:scale-[0.98]",
                                        selectedThreadId === `${conv._id}_${conv.otherParty._id}`
                                            ? "bg-primary/10 border-primary/20 shadow-md"
                                            : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                                        selectedThreadId === `${conv._id}_${conv.otherParty._id}` ? "bg-primary" : "bg-transparent"
                                    )} />

                                    <div className="h-10 w-10 relative shrink-0 group-hover:scale-110 transition-transform">
                                        <Avatar className="h-10 w-10 border border-white/10 shadow-inner">
                                            <AvatarImage
                                                src={conv.otherParty.profilePicture?.startsWith('http')
                                                    ? conv.otherParty.profilePicture
                                                    : conv.otherParty.profilePicture
                                                        ? `${API_BASE}${conv.otherParty.profilePicture}`
                                                        : undefined}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-[10px] font-bold text-white">
                                                {conv.otherParty.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Status Indicator Overlay */}
                                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background flex items-center justify-center p-0.5">
                                            {conv.status === "problem solved" ? (
                                                <div className="bg-emerald-500 rounded-full p-0.5">
                                                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="bg-amber-500 rounded-full p-0.5">
                                                    <AlertTriangle className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h3 className={cn("font-bold text-sm truncate pr-2", selectedThreadId === `${conv._id}_${conv.otherParty._id}` ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")}>
                                                {conv.otherParty.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-muted-foreground/60 whitespace-nowrap">
                                                    {new Date(conv.lastMessage?.createdAt || conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteChat(conv._id, conv.otherParty._id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 rounded-md text-muted-foreground hover:text-rose-500 transition-all"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 h-4">
                                            {conv.lastMessage ? (
                                                <>
                                                    <span className="text-primary/70 font-medium text-[10px]">
                                                        {(conv.lastMessage.senderId?.name || "User").split(' ')[0]}:
                                                    </span>
                                                    <span className="truncate opacity-80">{conv.lastMessage.content}</span>
                                                </>
                                            ) : (
                                                <span className="italic flex items-center gap-1 text-[10px] opacity-60"><Lock className="h-2.5 w-2.5" /> Secure Channel</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* User Status Footer */}
                <div className="p-3 border-t bg-background/30 backdrop-blur-md">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-muted/50 border border-border/50">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Online • Encrypted</span>
                    </div>
                </div>
            </div>

            {/* --- CENTER PANEL: CHAT --- */}
            <div className={cn(
                "flex-1 flex flex-col h-full relative z-10 transition-all duration-500",
                !selectedThreadId && isMobile ? "hidden" : "flex"
            )}>
                {selectedThreadId && activeConversation ? (
                    <>
                        {/* Mobile Header */}
                        <div className="md:hidden h-14 border-b flex items-center px-4 gap-3 bg-background/80 backdrop-blur-xl shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedThreadId(null)} className="-ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex-1 truncate">
                                <h3 className="font-bold text-sm truncate">{activeConversation.title}</h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{activeConversation.type}</p>
                            </div>

                            {/* MOBILE ACTIONS (Reporter Only) */}
                            {((typeof activeConversation.userId === 'string' ? activeConversation.userId : activeConversation.userId?._id) === user?.id || isAdmin) && (
                                <div className="flex items-center gap-1">
                                    {activeConversation.status === 'rejected' ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleUpdateStatus('pending')}
                                            disabled={isUpdating}
                                            className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                                            title="Unarchive"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleUpdateStatus('rejected')}
                                            disabled={activeConversation.status === 'rejected' || isUpdating}
                                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                                            title="Archive"
                                        >
                                            <Archive className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleUpdateStatus('problem solved')}
                                        disabled={activeConversation.status === 'problem solved' || isUpdating}
                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                        title="Resolve"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <IncidentChat
                            incidentId={activeConversation._id}
                            incidentOwnerId={typeof activeConversation.userId === 'string' ? activeConversation.userId : activeConversation.userId._id}
                            otherUserId={activeConversation.otherParty._id}
                            incidentTitle={activeConversation.title}
                            isResolved={activeConversation.status === "problem solved"}
                            className="h-full rounded-none border-none bg-transparent shadow-none"
                        />
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-primary/10 to-blue-500/10 flex items-center justify-center mb-8 border border-border/50 shadow-2xl relative">
                                <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_ease-in-out_infinite]" />
                                <ShieldAlert className="h-14 w-14 text-primary opacity-80" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter text-foreground mb-3">Command Center</h2>
                            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                Select a secure channel from the left sidebar to establish encrypted communication and view incident intelligence.
                            </p>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* --- RIGHT PANEL: CONTEXT (Desktop Only) --- */}
            <div className={cn(
                "hidden xl:flex w-[350px] flex-col border-l bg-background/40 backdrop-blur-xl transition-all z-20",
                !selectedThreadId ? "translate-x-full absolute right-0 opacity-0" : "translate-x-0 opacity-100"
            )}>
                {activeConversation ? (
                    <div className="flex flex-col h-full">
                        {/* Map Preview */}
                        <div className="h-56 w-full relative bg-muted/20 shrink-0 border-b group overflow-hidden">
                            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
                            <div ref={mapContainerRef} className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700" />
                            <div className="absolute bottom-3 right-3 z-20">
                                <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border/50 text-[9px]">
                                    <MapPin className="h-3 w-3 mr-1" /> LOCATION
                                </Badge>
                            </div>
                        </div>

                        {/* Details */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                        <Badge variant="outline" className="uppercase tracking-widest text-[9px] font-black border-primary/30 text-primary bg-primary/5">
                                            {activeConversation.type}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(activeConversation.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight leading-tight">
                                        {activeConversation.title}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 border-b pb-1">
                                        Sitrep / Description
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {activeConversation.description || "No detailed description provided for this incident report."}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-muted/5 border border-border/50 space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Status</span>
                                        <Badge className={cn(
                                            "uppercase tracking-widest text-[9px] font-bold",
                                            activeConversation.status === 'problem solved' ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                                        )}>
                                            {activeConversation.status === 'problem solved' ? 'Resolved' : 'Active'}
                                        </Badge>
                                    </div>
                                    <Separator className="bg-border/50" />
                                    <Button
                                        variant="default"
                                        className="w-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground h-9 transition-all shadow-sm"
                                        onClick={() => navigate(`/?incident=${activeConversation._id}`)}
                                    >
                                        View Full Report Details
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Actions (Reporter Only) */}
                        {((typeof activeConversation.userId === 'string' ? activeConversation.userId : activeConversation.userId?._id) === user?.id || isAdmin) && (
                            <div className="p-4 border-t space-y-2 bg-background/50">
                                <div className="grid grid-cols-2 gap-2">
                                    {activeConversation.status === 'rejected' ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleUpdateStatus('pending')}
                                            disabled={isUpdating}
                                            className="h-10 text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border-amber-500/30 shadow-none transition-all"
                                        >
                                            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RotateCcw className="h-3.5 w-3.5 mr-2" />}
                                            Unarchive
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleUpdateStatus('rejected')}
                                            disabled={activeConversation.status === 'rejected' || isUpdating}
                                            className="h-10 text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/30 shadow-none transition-all"
                                        >
                                            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Archive className="h-3.5 w-3.5 mr-2" />}
                                            Archive
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('problem solved')}
                                        disabled={activeConversation.status === 'problem solved' || isUpdating}
                                        className="h-10 text-xs font-black uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary hover:text-white border-primary/30 shadow-none transition-all"
                                    >
                                        {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                                        Resolve
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center opacity-20">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
