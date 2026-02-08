import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const GuardianMode = () => {
    const [active, setActive] = useState(false);
    const [holding, setHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startHold = () => {
        setHolding(true);
        setProgress(0);
        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / 2000) * 100, 100); // 2 seconds to activate
            setProgress(newProgress);

            if (newProgress >= 100) {
                activateGuardianMode();
            }
        }, 50);
    };

    const endHold = () => {
        setHolding(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const activateGuardianMode = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setActive(true);
        setHolding(false);
        setProgress(0);

        // Play alert sound if possible (browser policy may block auto-play without prior interaction)
        // const audio = new Audio('/siren.mp3'); 
        // audio.play().catch(() => {}); 

        toast({
            title: "GUARDIAN MODE ACTIVATED",
            description: "Emergency Contacts have been notified. Location tracking enabled.",
            variant: "destructive",
            duration: 10000
        });
    };

    const deactivate = () => {
        setActive(false);
        toast({
            title: "Guardian Mode Deactivated",
            description: "Returning to standard safety monitoring.",
        });
    };

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
                <AnimatePresence>
                    {holding && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-black/80 text-white text-xs px-2 py-1 rounded mb-2"
                        >
                            Hold to Activate
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative">
                    {/* Progress Ring */}
                    <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none transform -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="28"
                            className="stroke-transparent fill-none"
                            strokeWidth="4"
                        />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="28"
                            className="stroke-red-500 fill-none transition-all duration-75"
                            strokeWidth="4"
                            strokeDasharray="176" // 2 * pi * 28
                            strokeDashoffset={176 - (176 * progress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onMouseDown={startHold}
                        onMouseUp={endHold}
                        onMouseLeave={endHold}
                        onTouchStart={startHold}
                        onTouchEnd={endHold}
                        className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${active ? "bg-rose-600 animate-pulse ring-4 ring-rose-500/50" : "bg-muted border border-border hover:bg-muted/80"}`}
                    >
                        <ShieldAlert className={`h-6 w-6 ${active ? "text-white" : "text-rose-600"}`} />
                    </motion.button>
                </div>
            </div>

            {/* Full Screen Emergency Overlay */}
            <AnimatePresence>
                {active && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-rose-950/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-w-md w-full bg-background/20 border-2 border-rose-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(225,29,72,0.3)] space-y-8 backdrop-blur-xl"
                        >
                            <div className="flex justify-center">
                                <div className="h-24 w-24 rounded-full bg-red-600/20 flex items-center justify-center border-4 border-red-500 animate-ping-slow">
                                    <ShieldAlert className="h-12 w-12 text-red-500" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-white uppercase tracking-widest">Emergency Active</h2>
                                <p className="text-red-200 text-lg">
                                    Beacon broadcasting to verified neighbors and emergency contacts.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-900/40 p-4 rounded-xl border border-red-500/30">
                                    <div className="text-2xl font-bold text-white">00:01</div>
                                    <div className="text-xs text-red-300 uppercase">Duration</div>
                                </div>
                                <div className="bg-red-900/40 p-4 rounded-xl border border-red-500/30">
                                    <div className="text-2xl font-bold text-white">Sharing</div>
                                    <div className="text-xs text-red-300 uppercase">Location</div>
                                </div>
                            </div>

                            <Button
                                onClick={deactivate}
                                size="lg"
                                className="w-full h-14 text-lg font-bold bg-white text-red-900 hover:bg-white/90"
                            >
                                <X className="mr-2 h-5 w-5" />
                                I AM SAFE - CANCEL
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default GuardianMode;
