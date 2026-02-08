import { useState } from "react";
import { Shield, LifeBuoy, User, LogOut, Settings, LogIn, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import NotificationCenter from "./NotificationCenter";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, isAdmin, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSignOut = () => {
        signOut();
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-[60] border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300 shadow-sm pt-[max(env(safe-area-inset-top),35px)]">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
                    <div className="rounded-xl p-2 bg-gradient-to-tr from-primary to-blue-500 shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                        <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="text-xl md:text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">SafetyWatch</span>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />

                    {isAdmin && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate("/admin")}
                            className="bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold transition-all active:scale-95 border border-primary/20 shadow-none px-4"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Admin Panel
                        </Button>
                    )}

                    {user ? (
                        <>
                            <NotificationCenter />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/profile")}
                                className="text-muted-foreground hover:text-foreground font-bold hover:bg-muted/50 rounded-xl px-4 transition-all"
                            >
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/inbox")}
                                className="text-muted-foreground hover:text-foreground font-bold hover:bg-muted/50 rounded-xl px-4 transition-all"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Messages
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/support")}
                                className="text-muted-foreground hover:text-foreground font-bold hover:bg-muted/50 rounded-xl px-4 transition-all"
                            >
                                <LifeBuoy className="mr-2 h-4 w-4" />
                                Support
                            </Button>

                            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-rose-600 font-bold hover:bg-rose-500/10 rounded-xl px-4 transition-all">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" onClick={() => navigate("/auth")} className="shadow-xl shadow-primary/20 bg-primary text-primary-foreground font-black px-6 h-11 rounded-xl hover:scale-105 active:scale-95 transition-all">
                            <LogIn className="mr-2 h-4 w-4" />
                            Get Started
                        </Button>
                    )}
                </div>

                {/* Mobile Actions */}
                <div className="flex md:hidden items-center gap-2">
                    <ThemeToggle />
                    {user && <NotificationCenter />}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                        {isMobileMenuOpen ? (
                            <LogOut className="h-6 w-6 rotate-180 transition-transform" /> // Using LogOut icon as 'Close' style or X
                        ) : (
                            <div className="space-y-1.5">
                                <span className="block w-6 h-0.5 bg-foreground"></span>
                                <span className="block w-4 h-0.5 bg-foreground ml-auto"></span>
                                <span className="block w-5 h-0.5 bg-foreground ml-auto"></span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-2xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-5 z-[60]">
                    {user ? (
                        <>
                            <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Signed in as {user.email}
                            </div>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    onClick={() => { navigate("/admin"); setIsMobileMenuOpen(false); }}
                                    className="justify-start h-12 border-primary/20 bg-primary/5 text-primary font-bold rounded-xl"
                                >
                                    <Settings className="mr-3 h-5 w-5" />
                                    Admin Console
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                onClick={() => { navigate("/profile"); setIsMobileMenuOpen(false); }}
                                className="justify-start h-12 text-foreground font-bold rounded-xl"
                            >
                                <User className="mr-3 h-5 w-5" />
                                My Profile
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => { navigate("/inbox"); setIsMobileMenuOpen(false); }}
                                className="justify-start h-12 text-foreground font-bold rounded-xl"
                            >
                                <MessageSquare className="mr-3 h-5 w-5" />
                                Messages
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => { navigate("/support"); setIsMobileMenuOpen(false); }}
                                className="justify-start h-12 text-foreground font-bold rounded-xl"
                            >
                                <LifeBuoy className="mr-3 h-5 w-5" />
                                Support Center
                            </Button>

                            <div className="h-px bg-border/50 my-1" />

                            <Button
                                variant="ghost"
                                onClick={handleSignOut}
                                className="justify-start h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-bold rounded-xl"
                            >
                                <LogOut className="mr-3 h-5 w-5" />
                                Sign Out
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={() => { navigate("/auth"); setIsMobileMenuOpen(false); }}
                            className="h-12 w-full bg-primary text-primary-foreground font-black rounded-xl shadow-lg"
                        >
                            <LogIn className="mr-2 h-5 w-5" />
                            Sign In / Register
                        </Button>
                    )}
                </div>
            )}
        </header>
    );
}
