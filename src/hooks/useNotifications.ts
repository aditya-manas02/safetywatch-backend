import { useState, useEffect, useCallback } from "react";
import { toast } from "./use-toast";

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: "announcement" | "incident_update" | "system_alert";
    isRead: boolean;
    link: string | null;
    createdAt: string;
    userId: string | null;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const res = await fetch(`${baseUrl}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch notifications");
            const data = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter((n: Notification) => !n.isRead && n.userId !== null).length);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = async (id: string) => {
        const notification = notifications.find(n => n._id === id);
        // Optimistically update local state
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));

        // If it's a global notification (userId is null), don't call backend as it's not persistable per-user yet
        if (notification && notification.userId === null) return;

        const token = localStorage.getItem("token");
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            await fetch(`${baseUrl}/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            // Revert on error (optional, but skipping for global/local split simplicity)
            console.error("Failed to sync read status");
        }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem("token");
        // Optimistically mark all as read locally
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            // This only marks personal notifications as read in DB
            await fetch(`${baseUrl}/api/notifications/read-all`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            toast({ title: "Error syncing read status", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const hasUnread = notifications.some(n => !n.isRead);

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications, hasUnread };
}
