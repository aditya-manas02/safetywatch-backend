import { useState, useEffect, useCallback } from "react";
import { Megaphone, Send, Loader2, History, ExternalLink, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export default function CreateAnnouncement() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [link, setLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");
            const res = await fetch(`${baseUrl}/api/notifications?history=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch history");
            const data = await res.json();
            // Filter only announcements (since backend returns all if admin)
            setHistory(data.filter((n: any) => n.userId === null));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement for everyone?")) return;

        setDeletingId(id);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");
            const res = await fetch(`${baseUrl}/api/notifications/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast({ title: "Announcement Deleted", description: "The broadcast has been removed for all users." });
            fetchHistory();
        } catch (err) {
            toast({ title: "Failed to delete", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            return toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
        }

        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");
            let normalizedLink = link.trim();
            if (normalizedLink && !normalizedLink.startsWith("http") && !normalizedLink.startsWith("/")) {
                if (normalizedLink.includes(".") || !normalizedLink.startsWith("#")) {
                    normalizedLink = `https://${normalizedLink}`;
                }
            }

            const res = await fetch(`${baseUrl}/api/notifications/announcement`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title, message, link: normalizedLink || null })
            });

            if (!res.ok) throw new Error("Failed to send announcement");

            toast({ title: "Announcement Sent", description: "All users have been notified." });
            setTitle("");
            setMessage("");
            setLink("");
            fetchHistory(); // Refresh history
        } catch (err) {
            toast({ title: "Failed to send", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
            <Card className="bg-card border-border shadow-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Megaphone className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg md:text-xl font-black">Global Announcement</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium text-xs md:text-sm">Send a notification to all community members.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground ml-1">Announcement Title</label>
                                <Input
                                    placeholder="e.g., Neighborhood Meeting Reminder"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-muted/50 h-10 md:h-12 rounded-xl focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground ml-1">Redirect Link (Optional)</label>
                                <Input
                                    placeholder="https://example.com/more-info"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    className="bg-muted/50 h-10 md:h-12 rounded-xl focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-foreground ml-1">Content Message</label>
                                <Textarea
                                    placeholder="Provide more details about the announcement..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="bg-muted/50 min-h-[100px] rounded-xl focus:ring-2 focus:ring-primary/50 p-4"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 md:h-14 bg-primary text-primary-foreground font-black text-base md:text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                                <span className="flex items-center gap-2">
                                    <Send className="h-5 w-5" /> BROADCAST ANNOUNCEMENT
                                </span>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b p-4 md:p-6">
                    <div className="flex items-center gap-3">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Broadcast History</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{history.length} Sent</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[300px] md:h-[400px]">
                        {loadingHistory ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <Megaphone className="h-10 w-10 mb-2 opacity-20" />
                                <p>No broadcast history found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {history.map((ann) => (
                                    <div key={ann._id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors space-y-3 relative group">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 md:gap-4 pr-0 md:pr-8">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-base md:text-lg">{ann.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                {ann.link && (
                                                    <Button variant="ghost" size="sm" asChild className="h-8 gap-2 text-xs">
                                                        <a href={ann.link} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-3 w-3" /> Link
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(ann._id)}
                                                    disabled={deletingId === ann._id}
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                                                >
                                                    {deletingId === ann._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-4">{ann.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
