export interface User {
    _id: string;
    email: string;
    name?: string;
    phone?: string;
    roles: string[];
    createdAt: string;
}

export interface Incident {
    _id: string;
    userId: string;
    type: string;
    title: string;
    description: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    imageUrl?: string | null;
    status: "pending" | "under process" | "approved" | "rejected" | "problem solved";
    isImportant?: boolean;
    createdAt: string;
}

export interface AuditLog {
    _id: string;
    adminName: string;
    action: string;
    targetType: string;
    details?: string;
    timestamp: string;
}

export interface SupportMessage {
    _id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    category: string;
    status: "unread" | "read" | "resolved";
    createdAt: string;
}
