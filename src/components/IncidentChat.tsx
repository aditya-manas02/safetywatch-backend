import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageSquare, Lock, CornerDownRight, Check, CheckCheck, Flag, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Types derived from IncidentCard usage
export interface MessageUser {
    _id: string;
    name: string;
    profilePicture?: string;
}

export interface Message {
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

interface IncidentChatProps {
    incidentId: string;
    incidentOwnerId: string; // The user ID of the reporter
    otherUserId?: string;   // The specific user this thread is with
    incidentTitle?: string;
    isResolved?: boolean;
    className?: string;
}

export function IncidentChat({ incidentId, incidentOwnerId, otherUserId, incidentTitle, isResolved, className }: IncidentChatProps) {
    const { user, token } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Reply state
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");

    // Reporting state
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState<"user" | "message">("user");
    const [reportTargetId, setReportTargetId] = useState<string | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [reportCategory, setReportCategory] = useState("harassment");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
    const API_BASE = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, activeReplyId]);

    const fetchMessages = async () => {
        if (!user || !token) return;
        try {
            const url = otherUserId
                ? `${API_BASE}/api/incidents/${incidentId}/messages?withUser=${otherUserId}`
                : `${API_BASE}/api/incidents/${incidentId}/messages`;

            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setIsAppLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchMessages();
        // Optional: Poll for new messages every 10 seconds
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [incidentId, otherUserId, user, token]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;
        setIsSending(true);

        // Determine receiverId: 
        // If I am the reporter, I'm talking to otherUserId.
        // If I am NOT the reporter, I'm talking to incidentOwnerId.
        const receiverId = user.id === incidentOwnerId ? otherUserId : incidentOwnerId;

        if (!receiverId) {
            toast.error("Could not determine recipient.");
            setIsSending(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    content: newMessage,
                    receiverId
                })
            });

            if (res.ok) {
                setNewMessage("");
                await fetchMessages();
                // Optimistic UI could go here, but fetching ensures sync
            } else {
                toast.error("Failed to send message");
            }
        } catch (err) {
            toast.error("Error sending message");
        } finally {
            setIsSending(false);
        }
    };

    const handleReply = async (messageId: string) => {
        if (!replyContent.trim() || !user) return;
        setIsSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/messages/${messageId}/reply`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ content: replyContent })
            });

            if (res.ok) {
                setReplyContent("");
                setActiveReplyId(null);
                await fetchMessages();
            }
        } catch (err) {
            toast.error("Error sending reply");
        } finally {
            setIsSending(false);
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim() || !user || !token) {
            toast.error("Please provide a reason for the report.");
            return;
        }

        setIsSubmittingReport(true);
        try {
            const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/report`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    reportedUserId: reportType === "user" ? otherUserId : messages.find(m => m._id === reportTargetId)?.senderId._id,
                    messageId: reportType === "message" ? reportTargetId : undefined,
                    reason: `${reportCategory.toUpperCase()}: ${reportReason}`
                })
            });

            if (res.ok) {
                toast.success("Report submitted successfully. Admins will review it.");
                setIsReportModalOpen(false);
                setReportReason("");
            } else {
                toast.error("Failed to submit report");
            }
        } catch (err) {
            toast.error("Error submitting report");
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const openReportModal = (type: "user" | "message", id?: string) => {
        setReportType(type);
        setReportTargetId(id || null);
        setIsReportModalOpen(true);
    };

    if (!user) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-muted/5 rounded-3xl border border-dashed border-white/10">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-foreground font-black uppercase tracking-widest text-sm">Secure Channel Locked</h3>
                    <p className="text-xs text-muted-foreground">Authentication required to access this frequency.</p>
                </div>
                <Button onClick={() => window.location.href = '/auth'} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                    Authenticate
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-background/60 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-2xl relative", className)}>
            {/* Header */}
            <div className="p-4 border-b border-border/50 bg-background/20 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-3">
                    {(() => {
                        // Find the other user from messages to get their profile picture
                        const otherUserMsg = messages.find(m => m.senderId._id !== user.id);
                        const otherUserData = otherUserMsg?.senderId;
                        return (
                            <div className="relative">
                                <Avatar className="h-10 w-10 border border-border/50 shadow-inner">
                                    <AvatarImage
                                        src={otherUserData?.profilePicture?.startsWith('http')
                                            ? otherUserData.profilePicture
                                            : otherUserData?.profilePicture
                                                ? `${API_BASE}${otherUserData.profilePicture}`
                                                : undefined}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 text-[10px] font-bold">
                                        {otherUserData?.name?.substring(0, 2).toUpperCase() || "..."}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                            </div>
                        );
                    })()}
                    <div>
                        <h3 className="text-sm font-black text-foreground tracking-tight uppercase">
                            {(() => {
                                const otherUserMsg = messages.find(m => m.senderId._id !== user.id);
                                return otherUserMsg?.senderId.name || "Secure Chat";
                            })()}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Encrypted • Live</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReportModal("user")}
                        className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                    >
                        <Flag className="h-3 w-3 mr-1" /> Report User
                    </Button>
                    {isAppLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none fixed" />

                {messages.length === 0 && !isAppLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 select-none">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 stroke-[1.5]" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Channel Open</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Be the first to transmit via this frequency.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId._id === user.id;

                            return (
                                <motion.div
                                    key={msg._id}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    className={cn("flex w-full gap-3", isMe ? "justify-end" : "justify-start")}
                                >
                                    {!isMe && (
                                        <Avatar className="h-8 w-8 border border-border/50 shadow-md mt-auto">
                                            <AvatarImage
                                                src={msg.senderId.profilePicture?.startsWith('http')
                                                    ? msg.senderId.profilePicture
                                                    : msg.senderId.profilePicture
                                                        ? `${API_BASE}${msg.senderId.profilePicture}`
                                                        : undefined}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-muted text-[9px] font-bold text-muted-foreground">
                                                {msg.senderId.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className={cn("flex flex-col max-w-[85%] md:max-w-[80%]", isMe ? "items-end" : "items-start")}>
                                        {/* Sender Name (only if not me) */}
                                        {!isMe && msg._id !== activeReplyId && (
                                            <span className="text-[10px] font-bold text-muted-foreground ml-1 mb-1">{msg.senderId.name}</span>
                                        )}

                                        {/* Message Bubble */}
                                        <div className={cn(
                                            "relative px-4 py-2.5 shadow-sm text-sm font-medium leading-relaxed backdrop-blur-md transition-all duration-200 group hover:shadow-md",
                                            isMe
                                                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm border border-primary/20"
                                                : "bg-muted/80 text-foreground rounded-2xl rounded-tl-sm border border-border/50"
                                        )}>
                                            {msg.content}

                                            {/* Timestamp & Status */}
                                            <div className={cn("flex items-center gap-1 justify-end mt-1 opacity-60 text-[9px] font-bold tracking-wider", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <CheckCheck className="h-2.5 w-2.5" />}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {!isMe && (
                                            <button
                                                onClick={() => setActiveReplyId(activeReplyId === msg._id ? null : msg._id)}
                                                className="text-[9px] font-bold text-muted-foreground hover:text-primary mt-1 flex items-center gap-1 transition-colors px-1"
                                            >
                                                Reply
                                            </button>
                                        )}

                                        {/* Report Message Action */}
                                        {!isMe && (
                                            <button
                                                onClick={() => openReportModal("message", msg._id)}
                                                className="text-[9px] font-bold text-muted-foreground/40 hover:text-rose-500 mt-1 flex items-center gap-1 transition-colors px-1"
                                            >
                                                <Flag className="h-2 w-2" /> Report
                                            </button>
                                        )}

                                        {/* Replies Display */}
                                        {msg.replies && msg.replies.length > 0 && (
                                            <div className="mt-2 space-y-1.5 w-full flex flex-col items-end">
                                                {msg.replies.map(reply => (
                                                    <motion.div
                                                        key={reply._id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="text-xs bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-foreground max-w-[95%]"
                                                    >
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] font-black uppercase text-primary opacity-70">
                                                                {reply.senderId.name}
                                                            </span>
                                                        </div>
                                                        {reply.content}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Inline Reply Input */}
                                        <AnimatePresence>
                                            {activeReplyId === msg._id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="w-full pl-2"
                                                >
                                                    <div className="flex gap-2 items-center bg-card/80 p-1.5 rounded-xl border border-border/50 shadow-lg">
                                                        <Input
                                                            autoFocus
                                                            value={replyContent}
                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                            className="h-8 bg-transparent border-none text-xs focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground"
                                                            placeholder="Write a reply..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleReply(msg._id);
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            size="icon"
                                                            className="h-7 w-7 rounded-lg bg-primary hover:bg-primary/90 shrink-0"
                                                            disabled={isSending || !replyContent.trim()}
                                                            onClick={() => handleReply(msg._id)}
                                                        >
                                                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-background/80 backdrop-blur-lg border-t border-border/50 shrink-0">
                {isResolved ? (
                    <div className="text-center py-2">
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                            Incident Resolved - Chat Archived
                        </Badge>
                    </div>
                ) : (
                    <div className="relative flex items-center gap-2 md:gap-3 w-full">
                        <div className="relative flex-1 group w-full">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm pointer-events-none"></div>
                            <div className="relative flex items-center">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={user.id === incidentOwnerId ? "Broadcast update..." : "Send secure message..."}
                                    className="bg-card/50 border-input focus-visible:ring-primary/50 text-sm h-12 rounded-xl pl-4 pr-12 shadow-sm placeholder:text-muted-foreground transition-all font-medium w-full text-foreground"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <div className="absolute right-2 top-2">
                                    <Button
                                        size="icon"
                                        disabled={!newMessage.trim() || isSending}
                                        onClick={handleSendMessage}
                                        className={cn(
                                            "h-8 w-8 rounded-lg transition-all duration-300 shadow-md",
                                            newMessage.trim()
                                                ? "bg-primary hover:bg-primary/90 text-primary-foreground scale-100 opacity-100"
                                                : "bg-muted text-muted-foreground scale-90 opacity-0 pointer-events-none"
                                        )}
                                    >
                                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-center mt-3">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                        <Lock className="h-2.5 w-2.5" /> End-to-End Encrypted Protocol
                    </p>
                </div>
            </div>

            {/* Reporting Modal */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-rose-500" />
                            Report {reportType === "user" ? "User" : "Message"}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground">
                            Help us keep the community safe. Tell us what's wrong.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Category</Label>
                            <RadioGroup value={reportCategory} onValueChange={setReportCategory} className="grid grid-cols-2 gap-3">
                                {[
                                    { id: "harassment", label: "Harassment" },
                                    { id: "spam", label: "Spam" },
                                    { id: "inappropriate", label: "Inappropriate" },
                                    { id: "violation", label: "Rule Violation" }
                                ].map((cat) => (
                                    <div key={cat.id} className="flex items-center space-x-2 bg-muted/30 p-3 rounded-xl border border-transparent hover:border-border transition-all">
                                        <RadioGroupItem value={cat.id} id={cat.id} className="text-rose-500" />
                                        <Label htmlFor={cat.id} className="text-xs font-bold cursor-pointer">{cat.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Details</Label>
                            <Textarea
                                placeholder="Describe the violation..."
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="min-h-[100px] bg-muted/30 border-border/50 rounded-2xl text-sm focus-visible:ring-rose-500/30"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsReportModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button
                            onClick={handleReport}
                            disabled={isSubmittingReport || !reportReason.trim()}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl px-6 shadow-lg shadow-rose-500/20"
                        >
                            {isSubmittingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default IncidentChat;
