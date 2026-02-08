import { useState, useEffect } from "react";
import { Loader2, Mail, CheckCircle2, Star, Trash2, Clock, Filter, MessageSquare, User, ExternalLink, Send, ArrowUpRight, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { SupportMessage } from "@/types";

export default function SupportManager() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedMsg, setSelectedMsg] = useState<SupportMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/api/support`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMessages(data);
    } catch {
      toast({ title: "Error", description: "Could not load support messages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/api/support/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: `Ticket marked as ${status}` });
        fetchMessages();
        if (selectedMsg?._id === id) setSelectedMsg(null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to update message", variant: "destructive" });
    }
  }

  async function deleteMessage(id: string) {
    if (!window.confirm("Delete this ticket permanently?")) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/api/support/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Ticket Deleted", description: "Message removed from terminal." });
        fetchMessages();
        if (selectedMsg?._id === id) setSelectedMsg(null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    }
  }

  const filtered = Array.isArray(messages) ? messages.filter(m => filter === "all" || m.status === filter) : [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      <p className="text-slate-500 font-black tracking-widest text-xs uppercase">Initializing Ticket Terminal...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.3em]">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            Live Support Node
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Citizen Feedback</h2>
          <p className="text-slate-500 font-medium">Encrypted mailbox for community inquiries and appeals.</p>
        </div>

        <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
          {["all", "unread", "read", "resolved"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === s ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 hover:text-slate-300"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        {/* TICKET LIST */}
        <div className={`${selectedMsg ? 'hidden lg:block lg:col-span-5' : 'col-span-1 lg:col-span-12'} space-y-4 transition-all duration-300`}>
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-white/5 rounded-3xl"
              >
                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <MessageSquare className="h-8 w-8 text-slate-500" />
                </div>
                <h4 className="text-white font-bold text-lg">Deck is Clear</h4>
                <p className="text-slate-500">No pending inquiries in this channel.</p>
              </motion.div>
            ) : (
              filtered.map((msg: SupportMessage) => (
                <motion.div
                  key={msg._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${selectedMsg?._id === msg._id
                    ? 'bg-blue-600/10 border-blue-500/50 shadow-xl shadow-blue-500/10'
                    : 'bg-[#071328] border-white/5 hover:border-white/10'
                    } ${msg.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''}`}
                  onClick={() => setSelectedMsg(msg)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`capitalize py-0 px-2 text-[10px] font-black border-none ${msg.category === 'incident-help' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {msg.category}
                      </Badge>
                      <span className="text-[10px] text-slate-600 font-black tracking-widest uppercase flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {(() => { try { return format(new Date(msg.createdAt), "HH:mm"); } catch { return "N/A"; } })()}
                      </span>
                    </div>
                    {msg.status === 'unread' && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
                  </div>

                  <h3 className="text-slate-100 font-black text-lg truncate group-hover:text-white transition-colors">
                    {msg.subject}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-medium">
                    <User className="h-3 w-3" /> {msg.name}
                  </p>

                  <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-4 w-4 text-blue-500" />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* DETAILS VIEW */}
        <AnimatePresence>
          {selectedMsg && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="col-span-1 lg:col-span-7 bg-[#0b1220] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 sticky top-20 md:top-32"
            >
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 pb-6 border-b border-white/5 gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-1 leading-tight">{selectedMsg.subject}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-blue-600 text-[10px] font-black uppercase tracking-widest">{selectedMsg.status}</Badge>
                    <span className="text-slate-500 text-xs font-medium">{(() => { try { return format(new Date(selectedMsg.createdAt), "PPP p"); } catch { return "N/A"; } })()}</span>
                  </div>
                </div>
                <div className="flex gap-2 self-end md:self-auto">
                  {selectedMsg.status !== 'resolved' && (
                    <Button size="icon" variant="outline" onClick={() => updateStatus(selectedMsg._id, "resolved")} className="h-10 w-10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </Button>
                  )}
                  <Button size="icon" variant="outline" onClick={() => deleteMessage(selectedMsg._id)} className="h-10 w-10 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setSelectedMsg(null)} className="h-10 w-10 border-white/10 text-slate-400 hover:bg-white/5 rounded-xl">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Citizen Alias</p>
                  <p className="text-slate-100 font-bold flex items-center gap-2 text-sm md:text-base"><User className="h-4 w-4 text-blue-500" /> {selectedMsg.name}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transmission Channel</p>
                  <p className="text-slate-100 font-bold flex items-center gap-2 truncate text-sm md:text-base"><Mail className="h-4 w-4 text-blue-500" /> {selectedMsg.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Transmission Decrypted</p>
                <div className="p-4 md:p-6 bg-slate-900/60 border border-white/5 rounded-3xl text-slate-300 leading-relaxed font-medium text-base md:text-lg whitespace-pre-wrap">
                  {selectedMsg.message}
                </div>
              </div>

              {selectedMsg.status !== 'resolved' && (
                <div className="mt-8 md:mt-10 p-4 md:p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="text-blue-400 font-bold">Waiting for moderator action</h4>
                    <p className="text-blue-400/60 text-sm font-medium">Resolve this ticket once inquiry is addressed.</p>
                  </div>
                  <Button onClick={() => updateStatus(selectedMsg._id, "resolved")} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-6 rounded-xl h-11">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve Ticket
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
