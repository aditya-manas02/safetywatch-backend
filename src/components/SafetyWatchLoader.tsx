import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import packageJson from "../../package.json";

export const SafetyWatchLoader = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 5000; // 5 seconds
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min(100, (elapsed / duration) * 100);

            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(interval);
            }
        }, 50); // Update every 50ms for smooth animation

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#020817] flex flex-col items-center justify-center z-[50]">
            {/* Fluid mesh background with strict dark masking */}
            <div className="absolute inset-0 bg-[#020817] overflow-hidden">
                <div className="mesh-bg opacity-40 mix-blend-screen" style={{ backgroundColor: '#020817' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full animate-pulse" />
                    <img
                        src="/assets/splash.png"
                        alt="SafetyWatch Shield"
                        className="h-full w-full object-contain relative z-10 mix-blend-screen"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.fallback-shield')?.classList.remove('hidden');
                        }}
                    />
                    <Shield className="fallback-shield hidden h-full w-full text-blue-500 relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent" />
                </div>

                <div className="mt-10 flex flex-col items-center">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    >
                        SafetyWatch
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1 }}
                        className="flex items-center gap-2 mt-4"
                    >
                        <div className="h-[1px] w-6 bg-blue-500" />
                        <p className="text-white font-mono tracking-[0.4em] text-[11px] font-bold uppercase drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                            v{packageJson.version} • SECURE SESSION
                        </p>
                        <div className="h-[1px] w-6 bg-blue-500" />
                    </motion.div>
                </div>
            </div>

            <div className="absolute bottom-16 flex flex-col items-center gap-4">
                <div className="w-56 h-[3px] bg-white/10 rounded-full overflow-hidden relative border border-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        transition={{ duration: 3, ease: [0.65, 0, 0.35, 1] }}
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.9)]"
                    />
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.7, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-[10px] font-black text-white tracking-[0.5em] uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                >
                    Initializing Secure Systems
                </motion.p>
            </div>
        </div>
    );
};
