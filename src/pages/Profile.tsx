// d:\safe-neighborhood-watch-main11\frontend\src\pages\Profile.tsx

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { IncidentCard } from "@/components/IncidentCard";
import {
    Shield, ArrowLeft, User, Mail, Phone, Save, RefreshCw, Lock,
    Eye, EyeOff, KeyRound, CheckCircle2, Calendar, Edit2, X, Camera,
    Info, MapPin, Trophy, MessageSquare, Clock
} from "lucide-react";


export default function Profile() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();

    const [myReports, setMyReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const reportsRef = useRef<HTMLDivElement>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [user, authLoading, navigate]);

    // Form and Display States
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [memberSince, setMemberSince] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [profilePic, setProfilePic] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Password change states
    const [passwordTab, setPasswordTab] = useState<"change" | "otp">("change");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // OTP reset states
    const [otpEmail, setOtpEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPasswordOtp, setNewPasswordOtp] = useState("");
    const [confirmPasswordOtp, setConfirmPasswordOtp] = useState("");
    const [showNewPasswordOtp, setShowNewPasswordOtp] = useState(false);
    const [showConfirmPasswordOtp, setShowConfirmPasswordOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // Timer effect for OTP resend cooldown
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (resendTimer > 0) {
            timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    // Fetch latest profile data on mount
    useEffect(() => {
        if (!authLoading && !user) {
            window.location.href = "/auth";
            return;
        }

        const fetchProfile = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
                const token = localStorage.getItem("token");
                if (!token) return;

                const res = await fetch(`${baseUrl}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Update User State
                    setName(data.name || "");
                    setEmail(data.email || "");
                    setOtpEmail(data.email || "");
                    setIsVerified(data.isVerified || false);
                    setProfilePic(data.profilePicture || "");

                    if (data.createdAt) {
                        setMemberSince(new Date(data.createdAt).toLocaleDateString(undefined, {
                            month: 'long',
                            year: 'numeric'
                        }));
                    } else {
                        setMemberSince("2024");
                    }

                    setPhone(data.phone || "");

                }
            } catch (err) {
                console.error("Failed to fetch fresh profile data", err);
            }
        };

        if (user) {
            // Initialize with auth context data first to avoid flash
            setName(user.name || "");
            setEmail(user.email || "");
            if ((user as any).createdAt) {
                setMemberSince(new Date((user as any).createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
            }
            if ((user as any).profilePicture) {
                setProfilePic((user as any).profilePicture);
            }

            fetchProfile();
            fetchMyReports();
            fetchMyReports();
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (searchParams.get("tab") === "reports") {
            setTimeout(() => {
                reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 500);
        }
    }, [searchParams]);

    const fetchMyReports = async () => {
        try {
            setLoadingReports(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch(`${baseUrl}/api/incidents/my-reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMyReports(data);
            }
        } catch (err) {
            console.error("Failed to fetch my reports", err);
        } finally {
            setLoadingReports(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");

            const res = await fetch(`${baseUrl}/api/users/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    phone: phone || ""

                }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            const data = await res.json();
            // Update local storage to keep sync
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...currentUser, ...data.user }));

            toast({ title: "Profile Updated", description: "Your information has been saved successfully." });
            setIsEditing(false);
        } catch (err) {
            toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "File too large", description: "Image size should be less than 5MB.", variant: "destructive" });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const token = localStorage.getItem("token");

            // 1. Upload Image
            const uploadRes = await fetch(`${baseUrl}/api/upload?folder=profiles`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Image upload failed");

            const uploadData = await uploadRes.json();
            const newProfilePicUrl = uploadData.url;

            // 2. Update Profile with URL
            const updateRes = await fetch(`${baseUrl}/api/users/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ profilePicture: newProfilePicUrl })
            });

            if (!updateRes.ok) throw new Error("Failed to save profile picture");

            setProfilePic(newProfilePicUrl);

            // Update local storage
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...currentUser, profilePicture: newProfilePicUrl }));

            toast({ title: "Success", description: "Profile picture updated!" });
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to update profile picture", variant: "destructive" });
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: "", color: "" };
        if (password.length < 6) return { strength: 1, label: "Weak", color: "bg-destructive" };
        if (password.length < 10) return { strength: 2, label: "Fair", color: "bg-yellow-500" };
        if (password.length < 14) return { strength: 3, label: "Good", color: "bg-blue-500" };
        return { strength: 4, label: "Strong", color: "bg-green-500" };
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
            return;
        }

        if (newPassword.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }

        setChangingPassword(true);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";

            const res = await fetch(`${baseUrl}/api/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user?.email,
                    currentPassword,
                    newPassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to change password");
            }

            toast({ title: "Success", description: "Password changed successfully!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleRequestOtp = async () => {
        if (resendTimer > 0) return;
        setSendingOtp(true);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";

            const res = await fetch(`${baseUrl}/api/auth/request-password-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: otpEmail }),
            });

            const data = await res.json();
            const rateLimit = data.rateLimit;

            if (!res.ok) {
                throw new Error(data.message || "Failed to send OTP");
            }

            const remainingMsg = rateLimit ? ` (${rateLimit.remaining} attempts remaining this hour)` : "";
            toast({ title: "OTP Sent", description: data.message + remainingMsg });
            setOtpSent(true);
            setResendTimer(30); // Start 30s cooldown
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResetPasswordOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPasswordOtp !== confirmPasswordOtp) {
            toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
            return;
        }

        if (newPasswordOtp.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }

        setResettingPassword(true);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";

            const res = await fetch(`${baseUrl}/api/auth/reset-password-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: otpEmail,
                    otp,
                    newPassword: newPasswordOtp
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to reset password");
            }

            toast({ title: "Success", description: data.message });
            setOtp("");
            setNewPasswordOtp("");
            setConfirmPasswordOtp("");
            setOtpSent(false);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setResettingPassword(false);
        }
    };

    const passwordStrength = getPasswordStrength(passwordTab === "change" ? newPassword : newPasswordOtp);

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;

    // Get user initials for avatar
    const getInitials = (n: string) => {
        return n.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen bg-background p-4 md:p-8 lg:p-12 pb-24"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate("/")} className="hover:bg-primary/10 -ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight">Profile Settings</h1>
                    <p className="text-muted-foreground font-medium text-lg">Manage your personal information and security preferences.</p>
                </div>

                {/* PREMIUM HERO SECTION */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-card border border-border/40 group">
                    <div className="h-40 bg-gradient-to-br from-primary via-indigo-600 to-blue-700 opacity-90 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <Shield className="h-48 w-48 text-white" />
                        </div>
                    </div>

                    <div className="px-8 pb-8 flex flex-col md:flex-row gap-6 items-start -mt-16 relative z-10">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div className="h-32 w-32 rounded-3xl bg-background p-1.5 shadow-2xl relative overflow-hidden transition-all transform group-hover:scale-105 group-hover:rotate-1 border border-border/50">
                                {profilePic ? (
                                    <img src={profilePic} alt={name} className="h-full w-full rounded-2xl object-cover" />
                                ) : (
                                    <div className="h-full w-full rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl font-black text-primary">
                                        {getInitials(name)}
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-background/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <Camera className="text-foreground h-8 w-8" />
                                </div>

                                {uploading && (
                                    <div className="absolute inset-0 bg-background/60 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <RefreshCw className="text-primary h-7 w-7 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {isVerified && (
                                <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-xl border-4 border-background z-20" title="Verified Member">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 pt-20 md:pt-24 space-y-2">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black tracking-tighter text-foreground">
                                            {name}
                                        </h2>
                                        {isVerified && (
                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-bold px-3">
                                                VERIFIED CITIZEN
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground font-bold text-base flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-primary/60" />
                                        {email}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted/30 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 mb-1">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    Active since {memberSince || "..."}_
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



                {/* Report History Section - PLACED PROMINENTLY */}
                <div ref={reportsRef} className="space-y-6 scroll-mt-6 pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground">Mission Logs</h2>
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Incident Statistics & Activity</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate("/")}
                                className="h-10 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all hover:scale-105"
                            >
                                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Return to Dashboard
                            </Button>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-4 py-1.5 uppercase tracking-tighter text-xs rounded-xl shadow-sm h-10 flex items-center">
                                {myReports.length} Signals Captured
                            </Badge>
                        </div>
                    </div>

                    {loadingReports ? (
                        <div className="flex justify-center py-20">
                            <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                        </div>
                    ) : myReports.length === 0 ? (
                        <Card className="border-dashed bg-muted/20 border-2 rounded-3xl">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                <Info className="h-12 w-12 text-muted-foreground mb-4 opacity-5" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">No signals detected in your sector.</p>
                                <Button variant="link" onClick={() => navigate("/")} className="mt-4 text-primary font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">Initiate First Report</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                            {myReports.map((report) => (
                                <Card key={report._id} className="overflow-hidden border-none glass-card-luxury group hover:shadow-2xl transition-all duration-500 rounded-3xl">
                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/20">
                                        <div className="p-8 md:w-3/4 space-y-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-black text-2xl tracking-tighter text-foreground group-hover:text-primary transition-colors">{report.title}</h3>
                                                        {report.isImportant && (
                                                            <Badge className="bg-orange-500 text-white text-[10px] font-black h-6 px-3 leading-none uppercase animate-pulse border-none shadow-lg shadow-orange-500/20 rounded-lg">priority</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xs text-muted-foreground/70 flex items-center gap-2 font-black uppercase tracking-widest">
                                                            <Calendar className="h-4 w-4 text-primary/40" />
                                                            {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge className={`
                                                    ${report.status === 'problem solved' ? 'bg-purple-600/10 text-purple-600 border-purple-600/20' : ''}
                                                    ${report.status === 'approved' ? 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20' : ''}
                                                    ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}
                                                    ${report.status === 'under process' ? 'bg-blue-600/10 text-blue-600 border-blue-600/20' : ''}
                                                    ${report.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                                                    text-[11px] font-black uppercase tracking-[0.15em] px-4 py-1.5 border shadow-sm rounded-xl backdrop-blur-md
                                                `}>
                                                    {report.status}
                                                </Badge>
                                            </div>
                                            <p className="text-base text-foreground/70 leading-relaxed italic border-l-4 border-primary/30 pl-6 py-1 font-medium bg-primary/5 rounded-r-2xl">{report.description}</p>
                                            <div className="flex flex-wrap items-center gap-8 pt-2">
                                                <div className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
                                                    <div className="p-1.5 bg-muted rounded-lg shadow-sm border border-border/40">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    {report.location}
                                                </div>
                                                <div className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
                                                    <div className="p-1.5 bg-muted rounded-lg shadow-sm border border-border/40">
                                                        <Shield className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    {report.type}
                                                </div>
                                            </div>
                                        </div>
                                        {report.imageUrl && (
                                            <div className="md:w-1/4 h-56 md:h-auto overflow-hidden relative">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
                                                <img
                                                    src={report.imageUrl}
                                                    alt={report.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-8 pt-8 border-t border-border/30">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-none shadow-2xl glass-card-luxury overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                                <div>
                                    <CardTitle className="text-xl font-black tracking-tight uppercase">Identity Hub</CardTitle>
                                    <CardDescription className="font-bold text-xs text-muted-foreground/60 uppercase tracking-widest">Network Citizen Profile</CardDescription>
                                </div>
                                {!isEditing ? (
                                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-2 font-black text-[10px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl transition-all hover:scale-105 active:scale-95">
                                        <Edit2 className="h-3.5 w-3.5" /> Start Modification
                                    </Button>
                                ) : (
                                    <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive font-black text-[10px] uppercase tracking-widest rounded-xl">
                                        <X className="h-3.5 w-3.5" /> Abort
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="pt-8">
                                <form onSubmit={handleSave} className="space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="p-name" className="font-black text-[11px] uppercase tracking-[0.2em] ml-1 text-primary/70">Display Name</Label>
                                            <div className="relative group">
                                                <User className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${isEditing ? 'text-primary' : 'text-muted-foreground/30'}`} />
                                                <Input
                                                    id="p-name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className={`pl-11 h-14 rounded-2xl text-base font-bold transition-all border-none ${isEditing ? 'input-premium' : 'bg-transparent shadow-none cursor-default'}`}
                                                    readOnly={!isEditing}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="p-email" className="font-black text-[11px] uppercase tracking-[0.2em] ml-1 text-primary/70">Secure Email</Label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/30" />
                                                <Input
                                                    id="p-email"
                                                    value={email}
                                                    disabled
                                                    className="pl-11 h-14 rounded-2xl bg-muted/10 border-none text-muted-foreground/50 text-base shadow-none cursor-not-allowed font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-3">
                                            <Label htmlFor="p-phone" className="font-black text-[11px] uppercase tracking-[0.2em] ml-1 text-primary/70">Encrypted Contact</Label>
                                            <div className="relative group flex-1">
                                                <Phone className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${isEditing ? 'text-primary' : 'text-muted-foreground/30'}`} />
                                                <Input
                                                    id="p-phone"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+91 00000 00000"
                                                    className={`pl-11 h-14 rounded-2xl text-base font-bold transition-all border-none ${isEditing ? 'input-premium' : 'bg-transparent shadow-none cursor-default'}`}
                                                    readOnly={!isEditing}
                                                />
                                            </div>

                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isEditing && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="pt-2"
                                            >
                                                <Button type="submit" className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/10 bg-primary hover:bg-primary/90" disabled={saving}>
                                                    {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                    {saving ? "Synchronizing..." : "Update Network Identity"}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-2xl glass-card-luxury overflow-hidden">
                            <div className="h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-blue-500 w-full"></div>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                                        <Lock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-xl font-black tracking-tighter uppercase text-foreground">Access Protocol</CardTitle>
                                        <CardDescription className="font-bold text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">Security Credential Management</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-4">
                                <div className="flex gap-2 p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setPasswordTab("change")}
                                        className={`flex-1 py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-500 ${passwordTab === "change"
                                            ? "bg-background text-primary shadow-xl ring-1 ring-border/50 scale-[1.02] z-10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                            }`}
                                    >
                                        Direct Override
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPasswordTab("otp")}
                                        className={`flex-1 py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-500 ${passwordTab === "otp"
                                            ? "bg-background text-primary shadow-xl ring-1 ring-border/50 scale-[1.02] z-10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                            }`}
                                    >
                                        OTP Signal
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {passwordTab === "change" ? (
                                        <motion.form
                                            key="change"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, ease: "circOut" }}
                                            onSubmit={handleChangePassword}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-3">
                                                <Label className="font-black text-[11px] uppercase tracking-[0.2em] ml-2 text-primary/70">Origin Password</Label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-4 h-4 w-4 text-primary transition-colors" />
                                                    <Input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        className="pl-11 pr-12 h-14 rounded-2xl border-none input-premium text-base font-bold"
                                                        required
                                                    />
                                                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-4 text-muted-foreground/50 hover:text-primary transition-colors">
                                                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="font-black text-[11px] uppercase tracking-[0.2em] ml-2 text-primary/70">New Secure sequence</Label>
                                                <div className="relative group">
                                                    <KeyRound className="absolute left-4 top-4 h-4 w-4 text-primary transition-colors" />
                                                    <Input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="pl-11 pr-12 h-14 rounded-2xl border-none input-premium text-base font-bold"
                                                        required
                                                    />
                                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-4 text-muted-foreground/50 hover:text-primary transition-colors">
                                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="font-black text-[11px] uppercase tracking-[0.2em] ml-2 text-primary/70">Confirm Sequence</Label>
                                                <div className="relative group">
                                                    <Shield className="absolute left-4 top-4 h-4 w-4 text-primary transition-colors" />
                                                    <Input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="pl-11 pr-12 h-14 rounded-2xl border-none input-premium text-base font-bold"
                                                        required
                                                    />
                                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-muted-foreground/50 hover:text-primary transition-colors">
                                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90 transition-all shadow-2xl hover:scale-[1.02] active:scale-95 active:shadow-inner" disabled={changingPassword}>
                                                {changingPassword ? <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> : <Shield className="mr-3 h-5 w-5" />}
                                                {changingPassword ? "HARDENING..." : "Authorize Update"}
                                            </Button>
                                        </motion.form>
                                    ) : (
                                        <motion.div
                                            key="otp"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, ease: "circOut" }}
                                            className="space-y-8"
                                        >
                                            {!otpSent ? (
                                                <div className="space-y-6">
                                                    <p className="text-sm text-foreground/70 font-bold leading-relaxed bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-inner">
                                                        Initiate <strong className="text-primary tracking-widest">SHIELD PROTOCOL</strong>. We will dispatch a high-security validation signal to <strong className="text-foreground">{email}</strong>.
                                                    </p>
                                                    <Button type="button" onClick={handleRequestOtp} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95" disabled={sendingOtp}>
                                                        {sendingOtp ? <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> : <Mail className="mr-3 h-5 w-5" />}
                                                        Broadcast Code
                                                    </Button>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleResetPasswordOtp} className="space-y-8">
                                                    <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl text-[10px] font-black border border-emerald-500/20 text-center uppercase tracking-[0.3em] backdrop-blur-sm animate-pulse shadow-inner">
                                                        Signal Intercepted: Validation Required
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            name="otp_code_do_not_autofill"
                                                            autoComplete="off"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                            placeholder="0 0 0 - 0 0 0"
                                                            className="h-20 rounded-2xl border-none input-premium text-center text-4xl font-black tracking-[0.5em] focus-visible:ring-primary/40 shadow-2xl"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Input
                                                            type={showNewPasswordOtp ? "text" : "password"}
                                                            name="new_password_reset"
                                                            autoComplete="new-password"
                                                            placeholder="New Secure Sequence"
                                                            value={newPasswordOtp}
                                                            onChange={(e) => setNewPasswordOtp(e.target.value)}
                                                            className="h-14 rounded-2xl border-none input-premium text-base font-bold px-6"
                                                            required
                                                        />
                                                        <Input
                                                            type={showConfirmPasswordOtp ? "text" : "password"}
                                                            name="confirm_password_reset"
                                                            autoComplete="new-password"
                                                            placeholder="Confirm Sequence"
                                                            value={confirmPasswordOtp}
                                                            onChange={(e) => setConfirmPasswordOtp(e.target.value)}
                                                            className="h-14 rounded-2xl border-none input-premium text-base font-bold px-6"
                                                            required
                                                        />
                                                    </div>
                                                    <Button type="submit" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-primary shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all" disabled={resettingPassword}>
                                                        {resettingPassword ? <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> : <KeyRound className="mr-3 h-5 w-5" />}
                                                        Execute Reset
                                                    </Button>
                                                    <div className="flex flex-col items-center gap-4 mt-2">
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                                                            Didn't receive code?{" "}
                                                            <button type="button" onClick={handleRequestOtp} disabled={sendingOtp || resendTimer > 0} className="text-primary font-black hover:underline disabled:opacity-50">
                                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Now"}
                                                            </button>
                                                        </p>
                                                        <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors text-center">
                                                            Re-route Request
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        {/* SYSTEM STATUS CARD */}
                        <Card className="border-none shadow-2xl glass-card-luxury overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black tracking-[0.2em] uppercase text-primary/80">Monitor Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-inner group/status">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identity Verified</span>
                                    </div>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 group-hover/status:scale-110 transition-transform" />
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 shadow-inner group/status">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Class</span>
                                    </div>
                                    <span className="text-blue-600 font-black uppercase tracking-widest text-[11px] group-hover/status:scale-105 transition-transform">{user?.roles?.[0] || "Citizen"}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner group/status">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shield Protocol</span>
                                    </div>
                                    <span className="text-primary font-black uppercase tracking-widest text-[11px] group-hover/status:scale-105 transition-transform">AES-256</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-primary via-indigo-600 to-blue-700 text-primary-foreground shadow-2xl shadow-primary/30 relative overflow-hidden group border border-white/10">
                            {/* Decorative Mesh */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 blur-[80px] translate-y-1/2 -translate-x-1/2 rounded-full" />

                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                                <Shield className="h-32 w-32" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">Guardian Elite</h3>
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Status: Master Defender</p>
                                </div>

                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
                                    <p className="text-xs font-bold leading-relaxed">
                                        You have successfully broadcasted <strong className="text-white text-sm">{myReports.length}</strong> critical signals. Your vigilance maintains neighborhood integrity.
                                    </p>
                                </div>

                                <Button
                                    onClick={() => navigate("/leaderboard")}
                                    className="w-full h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold text-[10px] uppercase tracking-[0.15em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 group/btn"
                                >
                                    <Trophy className="mr-2 h-4 w-4 text-yellow-400 group-hover/btn:scale-110 transition-transform" />
                                    View Sector Leaderboard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
