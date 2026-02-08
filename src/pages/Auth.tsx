import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Mail, Lock, CheckCircle2, MapPin, Bell, Users, Eye, EyeOff, LifeBuoy, Flag, Sparkles, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { YetiAnimation } from "@/components/YetiAnimation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});


const AnimatedEye = ({ show, className }: { show: boolean, className?: string }) => {
  return (
    <div className={`relative ${className} flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]"
      >
        {/* Eye Base Outline */}
        <motion.path
          d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
          animate={{ opacity: show ? 1 : 0.6 }}
        />

        {/* Pupil */}
        <motion.circle
          cx="12"
          cy="12"
          r="3"
          fill="currentColor"
          initial={false}
          animate={{
            scale: show ? 1 : 0,
            opacity: show ? 1 : 0,
            y: show ? [0, -0.5, 0.5, 0] : 0,
          }}
          transition={{
            duration: 0.3,
            type: "spring",
            stiffness: 400,
            damping: 25,
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
        />

        {/* Eyelid Morph */}
        <motion.path
          d="M2 12s3-7 10-7 10 7 10 7"
          initial={false}
          animate={{
            d: show
              ? "M2 12s3-7 10-7 10 7 10 7"
              : "M2 12s3 4 10 4 10-4 10-4",
          }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Premium Slash */}
        <motion.path
          d="M18.36 18.36l-12.72-12.72"
          initial={false}
          animate={{
            pathLength: show ? 0 : 1,
            opacity: show ? 0 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />

        {/* Subtle Inner Glow */}
        <AnimatePresence>
          {show && (
            <motion.circle
              cx="12"
              cy="12"
              r="7"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-primary fill-current pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
};


const Auth = () => {
  const navigate = useNavigate();
  const { user, signUp, signIn, forgotPassword, verifyOtp, resendOtp, isLoading } = useAuth();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Animation States for Bear
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Support Dialog State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supportMessage.length < 10) {
      toast({ title: "Validation Error", description: "Message must be at least 10 characters.", variant: "destructive" });
      return;
    }
    setIsSubmittingSupport(true);
    try {
      const res = await fetch(`${API_BASE}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supportName,
          email: supportEmail,
          category: "account-issue",
          subject: "Auth Help Request",
          message: supportMessage
        })
      });
      if (res.ok) {
        toast({ title: "Help Request Sent", description: "Our team will contact you shortly." });
        setIsSupportOpen(false);
        setSupportMessage("");
      } else {
        throw new Error("Failed to send");
      }
    } catch {
      toast({ title: "Error", description: "Could not send help request.", variant: "destructive" });
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  useEffect(() => {
    setIsEmailFocused(false);
    setIsPasswordFocused(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [activeTab]);

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.length < 2) {
      toast({ title: "Error", description: "Name must be at least 2 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    const { error, rateLimit } = await signUp(email, password, name);
    setLoading(true); // Resetting loading after signUp call
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      const remainingMsg = rateLimit ? ` (${rateLimit.remaining} attempts remaining this hour)` : "";
      toast({ title: "OTP Sent!", description: `Please check your email for the verification code.${remainingMsg}` });
      setVerifyingEmail(email);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error, needsVerification } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (needsVerification) {
        toast({ title: "Verification Required", description: "Please verify your email address." });
        setVerifyingEmail(email);
      } else {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      }
    } else {
      navigate("/");
    }
  };


  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (verifyingEmail) {
      const { error } = await verifyOtp(verifyingEmail, otp);
      if (error) toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      else navigate("/");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    if (verifyingEmail) {
      const { error, rateLimit } = await resendOtp(verifyingEmail);
      setLoading(false);

      if (error) {
        toast({ title: "Resend failed", description: error.message, variant: "destructive" });
      } else {
        const remainingMsg = rateLimit ? ` (${rateLimit.remaining} attempts remaining this hour)` : "";
        setResendTimer(30);
        toast({ title: "OTP Resent", description: `A new code has been issued.${remainingMsg}` });
      }
    } else {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { error, rateLimit } = await forgotPassword(email);
    setForgotLoading(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } else {
      const remainingMsg = rateLimit ? ` (${rateLimit.remaining} attempts remaining today)` : "";
      toast({
        title: "Password Reset Sent",
        description: `If an account exists for this email, you will receive a new system-generated password shortly.${remainingMsg}`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-x-hidden relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SafetyWatch</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-8">
            Securing our <br />
            <span className="text-white/70">communities, together.</span>
          </h2>

          <ul className="space-y-6">
            {[
              { icon: MapPin, text: "Real-time incident mapping & tracking" },
              { icon: Bell, text: "Instant neighborhood alerts & notifications" },
              { icon: Users, text: "Collaborative safety network with neighbors" },
              { icon: CheckCircle2, text: "Verified reports and admin oversight" }
            ].map((item, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * (i + 1) }} className="flex items-center gap-4 text-white/90">
                <div className="p-2 rounded-lg bg-white/10"><item.icon className="h-5 w-5" /></div>
                <span className="font-medium text-lg">{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="relative z-10 text-white/50 text-sm font-medium">
          &copy; 2026 SafetyWatch Platform. All rights reserved.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background relative overflow-y-auto w-full font-inter">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[100px]"
          />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[440px] space-y-8 py-12 relative z-10"
        >
          <div className="text-center lg:text-left">
            <motion.div variants={itemVariants} className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Welcome to SafetyWatch</motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground font-medium text-lg">Secure your community and stay informed.</motion.p>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="border border-border/40 bg-card/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-x"></div>
              <CardContent className="p-8 sm:p-10">
                <AnimatePresence mode="wait">
                  {verifyingEmail ? (
                    <motion.div key="verification" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-primary/10 rounded-full mb-2">
                          <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-black">Verify your identity</h2>
                        <p className="text-muted-foreground">
                          Enter the 6-digit code sent to <span className="font-bold text-foreground">{verifyingEmail}</span>
                        </p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-sm ml-1">One-Time Password</Label>
                          <div className="flex gap-2 justify-between">
                            {[...Array(6)].map((_, i) => (
                              <input
                                key={i}
                                type="text"
                                maxLength={1}
                                value={otp[i] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  const newOtp = otp.split("");
                                  newOtp[i] = val;
                                  setOtp(newOtp.join(""));
                                  if (val && i < 5) {
                                    (e.target.nextElementSibling as HTMLInputElement)?.focus();
                                  }
                                }}
                                className="w-12 h-14 text-center text-2xl font-black rounded-xl bg-muted/20 border-2 border-transparent focus:border-primary/40 focus:bg-background transition-all outline-none"
                              />
                            ))}
                          </div>

                          <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                            <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed">
                              Can't find the email? Check your <span className="font-bold text-primary">spam/junk folder</span> and mark it as "Not Spam" to ensure future delivery.
                            </p>
                          </div>
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 transition-all active:scale-[0.98]" disabled={loading}>{loading ? "Verifying..." : "Verify Identity"}</Button>

                        <div className="flex flex-col items-center gap-4 mt-6">
                          <p className="text-sm text-muted-foreground font-medium">
                            Didn't receive code?{" "}
                            <button type="button" onClick={handleResendOtp} disabled={loading || resendTimer > 0} className="text-primary font-bold hover:underline disabled:opacity-50">
                              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Now"}
                            </button>
                          </p>
                          <button type="button" onClick={() => { setVerifyingEmail(null); setOtp(""); }} className="text-sm font-bold text-muted-foreground hover:text-foreground">Change Email Address</button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                        <TabsTrigger value="signin" className="rounded-xl font-bold py-3 data-[state=active]:shadow-xl data-[state=active]:bg-background transition-all">Login</TabsTrigger>
                        <TabsTrigger value="signup" className="rounded-xl font-bold py-3 data-[state=active]:shadow-xl data-[state=active]:bg-background transition-all">Register</TabsTrigger>
                      </TabsList>

                      <TabsContent value="signin">
                        <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSignIn} className="space-y-6">
                          <YetiAnimation
                            isEmailFocused={isEmailFocused}
                            isPasswordFocused={isPasswordFocused}
                            showPassword={showPassword}
                            emailValue={email}
                          />
                          <div className="space-y-2">
                            <Label className="font-bold text-sm ml-1 text-[#217093]">Email Address</Label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#217093] group-focus-within:text-[#4eb8dd] transition-colors z-10" />
                              <Input
                                type="email"
                                placeholder="email@domain.com"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                }}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                className="pl-12 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                              <Label className="font-bold text-sm text-[#217093]">Password</Label>
                              <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-primary hover:text-primary/80">Forgot password?</button>
                            </div>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#217093] group-focus-within:text-[#4eb8dd] transition-colors" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                className="pl-12 pr-14 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                onMouseDown={(e) => e.preventDefault()}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                              >
                                <AnimatedEye show={!showPassword} className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading || forgotLoading}>
                              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles className="h-5 w-5" /></motion.div> : "Login to Account"}
                            </Button>
                          </div>
                        </motion.form>
                      </TabsContent>

                      <TabsContent value="signup">
                        <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSignUp} className="space-y-4">
                          <YetiAnimation
                            isEmailFocused={isEmailFocused}
                            isPasswordFocused={isPasswordFocused}
                            showPassword={showPassword}
                            emailValue={email}
                          />
                          <div className="space-y-2">
                            <Label className="font-bold text-sm ml-1 text-[#217093]">Full Name</Label>
                            <div className="relative group overflow-hidden">
                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#217093] group-focus-within:text-[4eb8dd] transition-colors" />
                              <Input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-12 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-sm ml-1 text-[#217093]">Email Address</Label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#217093] group-focus-within:text-[#4eb8dd] transition-colors" />
                              <Input
                                type="email"
                                placeholder="email@domain.com"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                }}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                className="pl-12 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-xs ml-1 text-[#217093]">Password</Label>
                              <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#217093] group-focus-within:text-[#4eb8dd] transition-colors" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  onFocus={() => setIsPasswordFocused(true)}
                                  onBlur={() => setIsPasswordFocused(false)}
                                  className="pl-12 pr-14 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                                >
                                  <AnimatedEye show={!showPassword} className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold text-xs ml-1 text-[#217093]">Confirm</Label>
                              <div className="relative group">
                                <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${password && confirmPassword ? (password === confirmPassword ? "text-green-500" : "text-red-500") : "text-muted-foreground"}`} />
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  onFocus={() => setIsPasswordFocused(true)}
                                  onBlur={() => setIsPasswordFocused(false)}
                                  className="pl-12 pr-14 h-14 rounded-xl bg-[#f3fafd] border-2 border-[#217093] focus-visible:ring-0 focus-visible:border-[#4eb8dd] text-base font-semibold text-[#353538] transition-all"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                                >
                                  <AnimatedEye show={!showConfirmPassword} className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>{loading ? "Creating Account..." : "Create Free Account"}</Button>
                          </div>
                        </motion.form>
                      </TabsContent>
                    </Tabs>
                  )}
                </AnimatePresence>

                <div className="mt-10 pt-8 border-t border-border/40 text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Need technical assistance?</p>
                  <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl font-bold bg-background/50 hover:bg-background border-border/50 transition-all gap-2 h-11 px-6"><LifeBuoy className="h-4 w-4 text-primary" />Contact Support</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/40 bg-card/90 backdrop-blur-xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3"><HelpCircle className="h-6 w-6 text-primary" />Support Center</DialogTitle>
                        <DialogDescription className="font-medium">Tell us what's wrong and we'll get back to you as soon as possible.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSupportSubmit} className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="font-bold text-xs ml-1">Name</Label>
                            <Input placeholder="John Doe" value={supportName} onChange={(e) => setSupportName(e.target.value)} className="rounded-xl bg-muted/20 border-none" required />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-xs ml-1">Email</Label>
                            <Input type="email" placeholder="john@example.com" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="rounded-xl bg-muted/20 border-none" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs ml-1">Your Message</Label>
                          <Textarea placeholder="Describe the issue you're facing..." value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} className="min-h-[120px] rounded-xl bg-muted/20 border-none resize-none" required />
                        </div>
                        <DialogFooter className="pt-4">
                          <Button type="submit" className="w-full h-12 rounded-xl font-black text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={isSubmittingSupport}>{isSubmittingSupport ? "Sending Request..." : "Submit Support Ticket"}</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <motion.div variants={itemVariants} className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-bold text-muted-foreground/60 tracking-wider">
              <a href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><Shield className="h-3 w-3" />TRUSTED NETWORK</a>
              <a href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><Lock className="h-3 w-3" />SECURE ACCESS</a>
              <a href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><Flag className="h-3 w-3" />REPORT INCIDENTS</a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <button className="hidden">Open</button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-3xl border-border/10 bg-black/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Security Notice</DialogTitle>
            <DialogDescription className="text-white/60 font-medium">Please ensure you are using a secure connection.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
