import { Bell, Info, AlertTriangle, CheckCircle, Check } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, hasUnread } = useNotifications();
    const navigate = useNavigate();

    const getIcon = (type: string) => {
        switch (type) {
            case "announcement": return <Info className="h-4 w-4 text-blue-500" />;
            case "incident_update": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case "system_alert": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-muted transition-all">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-4 w-4 bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center rounded-full border-2 border-background animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-border shadow-2xl bg-card">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
                    {hasUnread && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[11px] font-bold text-primary hover:text-primary/80 px-2">
                            <Check className="h-3 w-3 mr-1" /> Mark all read
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-6 text-center">
                            <Bell className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((n) => (
                                <div
                                    key={n._id}
                                    className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${!n.isRead ? 'bg-primary/5' : ''}`}
                                    onClick={() => {
                                        if (!n.isRead) markAsRead(n._id);
                                        // Only navigate if link is present AND it's not a placeholder
                                        if (n.link && n.link.trim() !== "" && n.link !== "#") {
                                            if (n.link.startsWith("http")) {
                                                window.open(n.link, "_blank", "noopener,noreferrer");
                                            } else {
                                                navigate(n.link);
                                            }
                                        }
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">{n.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                                            <p className="text-[10px] font-medium text-slate-500 mt-2">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!n.isRead && (
                                            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 border-t border-border">
                    <Button variant="ghost" className="w-full h-8 text-xs font-bold text-muted-foreground hover:text-foreground" onClick={() => navigate("/profile?tab=reports")}>
                        View detailed history
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
