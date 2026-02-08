import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Minus, Maximize2, Sparkles, Zap, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
    role: "user" | "bot";
    content: string;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "👋 Nexus AI initialized. I'm your intelligent safety companion, ready to assist with neighborhood insights, incident analysis, and security guidance. How can I help protect your community today?" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Magnetic interaction values
    const springConfig = { damping: 20, stiffness: 300 };
    const buttonX = useSpring(useMotionValue(0), springConfig);
    const buttonY = useSpring(useMotionValue(0), springConfig);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
            const res = await fetch(`${baseUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(1)
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Nexus server unreachable.");
            }
            const data = await res.json();
            setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
        } catch (err: any) {
            const errorMessage = err.message.includes("Failed to fetch")
                ? "Network anomaly detected. Retrying connection..."
                : "Processing Error. Algorithms interrupted.";
            setMessages((prev) => [...prev, { role: "bot", content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? "auto" : "500px", // Fixed height for Desktop Optimization
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        // DESKTOP UI FIX: Fixed width (380px) and nicer shadow/border
                        className="w-[90vw] sm:w-[380px] bg-[#09090b]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-[0_0_50px_-10px_rgba(168,85,247,0.4)] overflow-hidden flex flex-col mb-4 ring-1 ring-white/10"
                    >
                        {/* Nexus Header */}
                        <div
                            className="relative px-5 py-4 bg-gradient-to-r from-[#2e1065] via-[#1e1b4b] to-[#0f172a] border-b border-purple-500/20 flex items-center justify-between cursor-pointer group"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            {/* Animated digital noise */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="relative">
                                    <div className="absolute -inset-1 bg-purple-500/40 rounded-full blur-sm animate-pulse"></div>
                                    <img
                                        src="/nexus_logo.png"
                                        alt="Nexus Logo"
                                        className="h-9 w-9 relative z-10 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                                    />
                                    {/* Online indicator dot */}
                                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-cyan-400 border-2 border-[#1e1b4b] rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                                </div>
                                <div>
                                    <h3 className="font-orbitron font-bold text-base tracking-wider text-white flex items-center gap-2">
                                        NEXUS <span className="text-purple-400 text-[10px] font-normal tracking-widest">AI</span>
                                    </h3>
                                    <p className="text-[9px] text-purple-200/60 font-mono tracking-widest uppercase flex items-center gap-1">
                                        <Zap className="h-2 w-2 text-yellow-400" /> ONLINE
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 relative z-10">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-200/50 hover:text-purple-300 hover:bg-purple-900/50 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
                                    {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300/50 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        {!isMinimized && (
                            <>
                                <ScrollArea className="flex-1 p-4 bg-[#0a0a0a] relative">
                                    {/* Subtle grid background */}
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf610_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf610_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                                    <div className="space-y-6 relative z-10">
                                        {messages.map((m, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: m.role === "user" ? 20 : -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                {m.role === "bot" && (
                                                    <div className="h-7 w-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 mt-1">
                                                        <BrainCircuit className="h-4 w-4 text-purple-400" />
                                                    </div>
                                                )}

                                                <div className={`max-w-[85%] px-4 py-3 text-sm font-medium leading-relaxed shadow-lg backdrop-blur-sm ${m.role === "user"
                                                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-purple-500/20"
                                                    : "bg-[#18181b] border border-[#27272a] text-gray-200 rounded-2xl rounded-tl-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                                                    }`}>
                                                    {m.content}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {isLoading && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-center gap-2.5"
                                            >
                                                <div className="h-7 w-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0">
                                                    <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin-slow" />
                                                </div>
                                                <div className="flex gap-1 bg-[#18181b] px-3 py-2.5 rounded-2xl border border-[#27272a]">
                                                    <motion.span
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                                                        className="h-1.5 w-1.5 bg-purple-500 rounded-full"
                                                    />
                                                    <motion.span
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                                        className="h-1.5 w-1.5 bg-purple-500 rounded-full"
                                                    />
                                                    <motion.span
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                                                        className="h-1.5 w-1.5 bg-purple-500 rounded-full"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>

                                {/* Input Area */}
                                <div className="p-3 bg-[#09090b] border-t border-purple-500/20">
                                    <form onSubmit={handleSend} className="relative flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask Nexus..."
                                            className="flex-1 bg-[#18181b] text-purple-50 placeholder:text-gray-500 border border-[#27272a] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500/70 focus:border-purple-500/70 transition-all outline-none"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!input.trim() || isLoading}
                                            className="h-11 w-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_-5px_rgba(168,85,247,0.6)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                    <div className="flex justify-center mt-2 opacity-40">
                                        <p className="text-[8px] uppercase tracking-widest font-semibold flex items-center gap-1">
                                            <span className="h-1 w-1 bg-purple-500 rounded-full"></span>
                                            Quantum Encryption
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Liquid Energy AI Orb */}
            <div className="relative group isolate">
                {/* SVG Filter for Gooey Effect */}
                <svg className="absolute w-0 h-0 pointer-events-none">
                    <defs>
                        <filter id="goo">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                            <feBlend in="SourceGraphic" in2="goo" />
                        </filter>
                    </defs>
                </svg>

                {/* Magnetic Interaction Overlay */}
                <motion.div
                    className="absolute inset-0 -m-16 z-0 hidden sm:block"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left - rect.width / 2;
                        const y = e.clientY - rect.top - rect.height / 2;
                        buttonX.set(x * 0.2);
                        buttonY.set(y * 0.2);
                    }}
                    onMouseLeave={() => {
                        buttonX.set(0);
                        buttonY.set(0);
                    }}
                />

                <motion.button
                    style={{ x: buttonX, y: buttonY }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative h-16 w-16 sm:h-20 sm:w-20 transition-all duration-500 ease-out flex items-center justify-center pointer-events-auto"
                >
                    <AnimatePresence mode="wait">
                        {isOpen ? (
                            <motion.div
                                key="close-state"
                                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                                className="w-full h-full rounded-[24px] sm:rounded-[30px] bg-[#09090b]/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center shadow-2xl relative z-10"
                            >
                                <X className="h-8 w-8 text-white" />
                                {/* Internal light leak */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-[24px] sm:rounded-[30px]" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="orb-state"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative w-full h-full flex items-center justify-center"
                            >
                                {/* Gooey Energy Layer */}
                                <div style={{ filter: 'url(#goo)' }} className="absolute inset-0 w-full h-full scale-125">
                                    {/* Main Body */}
                                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-[0_0_30px_rgba(168,85,247,0.5)]"></div>

                                    {/* Morphing Droplets */}
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                x: [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10],
                                                y: [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10],
                                                scale: [1, 1.2, 1],
                                            }}
                                            transition={{
                                                duration: 3 + i,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="absolute inset-8 rounded-full bg-cyan-400/80 blur-sm"
                                        />
                                    ))}
                                </div>

                                {/* Premium Glass Core Overlay */}
                                <div className="absolute inset-0 rounded-[24px] sm:rounded-[30px] border border-white/20 bg-white/5 backdrop-blur-sm z-20 flex items-center justify-center overflow-hidden group-hover:border-white/40 transition-colors">
                                    {/* Scanner Line */}
                                    <motion.div
                                        animate={{ y: ['-100%', '200%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent z-30"
                                    />

                                    {/* BRAIN ICON CONSTRUCTION (REPLACES PNG) */}
                                    <div className="relative z-30 transform group-hover:scale-110 transition-transform duration-500">
                                        <div className="absolute -inset-4 bg-purple-500/20 blur-xl rounded-full"></div>
                                        <BrainCircuit className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
                                        <motion.div
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Sparkles className="h-14 w-14 text-cyan-400/30" />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Outer Energy Halo */}
                                <div className="absolute -inset-4 border border-purple-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                                <div className="absolute -inset-2 border border-cyan-400/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Cyber-Notification Badge */}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 z-40">
                        <span className="flex h-5 w-5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-[#09090b] shadow-[0_0_15px_rgba(34,211,238,0.5)]"></span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
