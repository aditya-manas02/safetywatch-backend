import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Shield,
  ArrowLeft,
  Mail,
  User,
  Send,
  MessageSquare,
  LifeBuoy,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Support() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "general",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/auth";
      return;
    }
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || ""
      }));
    }
  }, [user, isLoading]); // Removed 'navigate' from dependencies as it's not used for redirection within this effect

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.message.length < 10) {
      toast({ title: "Validation Error", description: "Message must be at least 10 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId: user?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message");

      setIsSuccess(true);
      toast({ title: "Success", description: "Your message has been sent successfully." });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "An unknown error occurred";
      toast({ title: "Error", description: error, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground p-6 md:p-12 lg:p-24"
    >
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl px-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* LEFT: INFO */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
                <LifeBuoy className="h-3.5 w-3.5" /> Citizen Support
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-foreground">How can we <span className="text-primary">help you?</span></h1>
              <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                Our moderation team is available 24/7 to ensure community safety. Whether it's a technical issue or a policy query, we're here to assist.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: <MessageSquare className="h-5 w-5" />, title: "Direct Ticketing", desc: "Internal encrypted system for rapid response.", color: "blue" },
                { icon: <Shield className="h-5 w-5" />, title: "Moderation Appeals", desc: "Contest reports or account status directly.", color: "emerald" },
                { icon: <LifeBuoy className="h-5 w-5" />, title: "Live Assistance", desc: "Priority support for verified contributors.", color: "amber" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-all shadow-sm"
                >
                  <div className={`h-12 w-12 rounded-xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500 group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT: FORM */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-cyan-400/20 blur-3xl opacity-50"></div>

            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative h-[600px] flex flex-col items-center justify-center text-center p-12 bg-card border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                  <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/40 text-white">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <h2 className="text-3xl font-black text-foreground mb-4">Transmission Successful</h2>
                  <p className="text-muted-foreground text-lg mb-10 max-w-sm">
                    Your request has been prioritized. A moderator will review your inquiry within the next 24 hours.
                  </p>
                  <Button onClick={() => setIsSuccess(false)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-12 font-bold text-base transition-all active:scale-95">
                    Submit Another Ticket
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="relative bg-card border border-border shadow-2xl rounded-3xl overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-accent w-full"></div>
                    <CardHeader className="px-8 pt-10 pb-6">
                      <CardTitle className="text-2xl font-black text-foreground">Send Transmission</CardTitle>
                      <CardDescription className="text-muted-foreground font-medium">Please detail your request for the moderation team.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
                            <div className="relative group">
                              <User className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Citizen Name"
                                className="pl-11 h-12 bg-muted/40 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                                placeholder="email@example.com"
                                className="pl-11 h-12 bg-muted/40 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Inquiry Category</Label>
                          <select
                            id="category"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: (e.target.value as "general" | "feedback" | "incident-help" | "account-issue" | "other") })}
                            className="w-full h-12 rounded-xl bg-muted/40 border-none text-foreground px-4 text-sm font-bold appearance-none outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            <option value="general">General Inquiry</option>
                            <option value="feedback">Feedback & Suggestions</option>
                            <option value="incident-help">Help with a Report</option>
                            <option value="account-issue">Account or Login Issue</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Subject</Label>
                          <Input
                            id="subject"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                            placeholder="What is this regarding?"
                            className="h-12 bg-muted/40 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center ml-1">
                            <Label htmlFor="message" className="text-xs font-black uppercase tracking-widest text-slate-500">Detailed Message</Label>
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.message.length >= 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {formData.message.length}/10 min
                            </span>
                          </div>
                          <Textarea
                            id="message"
                            placeholder="Describe your situation in detail..."
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            required
                            className="min-h-[140px] bg-muted/40 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground resize-none p-4"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 transition-all active:scale-[0.98]"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                              <LifeBuoy className="h-6 w-6" />
                            </motion.div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Send className="h-5 w-5" /> Submit Support Ticket
                            </div>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
