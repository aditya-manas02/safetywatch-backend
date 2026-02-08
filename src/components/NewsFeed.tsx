import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ChevronLeft, ChevronRight, X, ExternalLink, Calendar, Globe } from "lucide-react";

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    publishedAt: string;
    source: string;
}

export default function NewsFeed() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0); // -1 for left, 1 for right
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        loadNews();
        const interval = setInterval(loadNews, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (articles.length === 0 || selectedArticle) return;
        const slideInterval = setInterval(() => {
            setDirection(1);
            setCurrentIndex((prev) => (prev + 1) % articles.length);
        }, 6000);
        return () => clearInterval(slideInterval);
    }, [articles.length, selectedArticle]);

    async function loadNews() {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
        const API_BASE = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/api";

        try {
            // Add timestamp to bust cache
            const res = await fetch(`${API_BASE}/news?t=${Date.now()}`, {
                headers: { "x-app-version": "1.4.2" }
            });
            if (res.ok) {
                const data = await res.json();
                setArticles(data.articles.slice(0, 5));
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Failed to load news:", err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction > 0 ? 45 : -45,
            scale: 0.9,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            rotateY: 0,
            scale: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction < 0 ? 45 : -45,
            scale: 0.9,
        }),
    };

    const nextSlide = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % articles.length);
    };

    const prevSlide = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    };

    if (loading) {
        return (
            <div className="bg-card border rounded-2xl p-4 shadow-xl border-white/5 backdrop-blur-md">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/20 rounded-lg animate-pulse">
                            <Newspaper className="h-4 w-4 text-primary" />
                        </div>
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex gap-3 h-[180px]">
                    <div className="w-28 h-full bg-muted rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-full bg-muted rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                        <div className="h-12 w-full bg-muted rounded animate-pulse pt-4" />
                    </div>
                </div>
            </div>
        );
    }

    if (articles.length === 0) return null;

    const currentArticle = articles[currentIndex];

    return (
        <>
            <div className="group relative bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-primary/10">
                {/* Futuristic Header */}
                <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/20 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                            <Newspaper className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="font-bold text-xs tracking-[0.3em] uppercase text-foreground/90">RECENT NEWS</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex gap-1">
                            {articles.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 transition-all duration-500 rounded-full ${i === currentIndex ? "w-6 bg-primary shadow-[0_0_8px_#3b82f6]" : "w-1.5 bg-foreground/10"}`}
                                />
                            ))}
                        </div>
                        {lastUpdated && (
                            <span className="text-[9px] text-muted-foreground/60 font-mono tracking-tighter uppercase whitespace-nowrap">
                                UPDATED: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* 3D Carousel Container */}
                <div className="relative h-[240px] sm:h-[190px] w-full perspective-[1000px] overflow-hidden touch-pan-y">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = offset.x;
                                if (swipe < -50 || velocity.x < -100) nextSlide();
                                else if (swipe > 50 || velocity.x > 100) prevSlide();
                            }}
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.4 },
                                scale: { duration: 0.5 }
                            }}
                            onClick={() => setSelectedArticle(currentArticle)}
                            className="absolute inset-0 p-5 flex flex-col sm:flex-row gap-5 cursor-pointer hover:bg-muted/50 transition-colors group/item"
                        >
                            {currentArticle.imageUrl && (
                                <div className="relative flex-shrink-0 w-full sm:w-36 h-32 sm:h-full rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-muted">
                                    <img
                                        src={currentArticle.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110"
                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                        draggable="false"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                </div>
                            )}

                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                    <h5 className="font-black text-sm sm:text-base leading-tight text-foreground group-hover/item:text-primary transition-colors line-clamp-2 mb-2 tracking-tight">
                                        {currentArticle.title}
                                    </h5>
                                    {/* MINIMALIST SCALE: Description removed from slider to focus on Intelligence Summary in Modal */}
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-md border border-border/50 backdrop-blur-sm">
                                            <Globe className="h-3 w-3 text-primary/70" />
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest truncate max-w-[80px]">
                                                {currentArticle.source}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest">
                                            {formatTime(currentArticle.publishedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-primary text-[10px] font-black tracking-widest opacity-0 group-hover/item:opacity-100 transition-all translate-x-2 group-hover/item:translate-x-0">
                                        INTEL <ChevronRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Highly Refined Navigation Controls */}
                    <div className="absolute inset-y-0 left-3 flex items-center z-20 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="pointer-events-auto p-2 bg-background/60 backdrop-blur-xl border border-border/50 rounded-full hover:bg-primary hover:text-white text-foreground transition-all shadow-xl opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 group/nav"
                            aria-label="Previous news"
                        >
                            <ChevronLeft className="h-5 w-5 transition-transform group-hover/nav:-translate-x-0.5" />
                        </button>
                    </div>
                    <div className="absolute inset-y-0 right-3 flex items-center z-20 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="pointer-events-auto p-2 bg-background/60 backdrop-blur-xl border border-border/50 rounded-full hover:bg-primary hover:text-white text-foreground transition-all shadow-xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 group/nav"
                            aria-label="Next news"
                        >
                            <ChevronRight className="h-5 w-5 transition-transform group-hover/nav:translate-x-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* INTEGRATED INTELLIGENCE MODAL */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedArticle(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-[12px] cursor-zoom-out"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative w-full max-w-4xl bg-background border border-border/50 rounded-[32px] shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header/Hero Section */}
                            <div className="relative h-72 sm:h-96 w-full overflow-hidden shrink-0">
                                {selectedArticle.imageUrl ? (
                                    <img
                                        src={selectedArticle.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                                        <Newspaper className="h-24 w-24 text-primary/40" />
                                    </div>
                                )}

                                {/* Professional Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-transparent to-transparent opacity-20" />

                                {/* Floating Close Button */}
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="absolute top-6 right-6 p-2.5 bg-background/40 hover:bg-primary text-foreground hover:text-white rounded-full backdrop-blur-md border border-border/50 transition-all z-30 group shadow-lg"
                                >
                                    <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                </button>

                                {/* Metadata Hub */}
                                <div className="absolute bottom-8 left-8 right-8 z-20">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-4 mb-4"
                                    >
                                        <span className="px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full shadow-lg uppercase tracking-[0.2em] border border-white/10">
                                            {selectedArticle.source}
                                        </span>
                                        <div className="h-[1px] w-12 bg-foreground/20" />
                                        <span className="text-[10px] font-black text-foreground/60 uppercase tracking-[0.2em]">Verified Stream</span>
                                    </motion.div>

                                    <motion.h2
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-2xl sm:text-4xl font-black text-foreground leading-[1.15] tracking-tight max-w-3xl"
                                    >
                                        {selectedArticle.title}
                                    </motion.h2>
                                </div>
                            </div>

                            {/* Deep Intel Scroller */}
                            <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-gradient-to-b from-background to-muted/20 custom-scrollbar selection:bg-primary/30">
                                <div className="max-w-3xl mx-auto space-y-10">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6 border-y border-border/50"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Broadcast Date</p>
                                            <div className="flex items-center gap-2 text-foreground/80 font-bold">
                                                <Calendar className="h-4 w-4 text-foreground/30" />
                                                {new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, {
                                                    month: 'long', day: 'numeric', year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Protocol Status</p>
                                            <div className="flex items-center gap-2 text-emerald-500 font-black italic">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                VERIFIED INTEL
                                            </div>
                                        </div>
                                        <div className="hidden sm:block space-y-1">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Origin Network</p>
                                            <div className="flex items-center gap-2 text-foreground/80 font-bold">
                                                <Globe className="h-4 w-4 text-foreground/30" />
                                                Global Safety
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="space-y-8"
                                    >
                                        <p className="text-lg sm:text-xl text-foreground/90 leading-relaxed font-medium first-letter:text-5xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left first-letter:leading-none">
                                            {selectedArticle.description}
                                        </p>

                                        <div className="relative p-8 rounded-[24px] bg-primary/5 border border-primary/20 group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <ExternalLink className="h-24 w-24 text-primary" />
                                            </div>
                                            <div className="relative z-10">
                                                <h6 className="font-black text-primary text-xs uppercase tracking-[0.2em] mb-3">Intelligence Directive</h6>
                                                <p className="text-sm text-foreground/60 leading-relaxed mb-8 italic max-w-xl">
                                                    "This intelligence brief is synthesized from the Guardian Network's verified data conduits. For the exhaustive investigative file and original documentation from <span className="text-primary font-bold">{selectedArticle.source}</span>, please proceed to the source terminal below."
                                                </p>
                                                <a
                                                    href={selectedArticle.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/50 group/btn active:scale-95"
                                                >
                                                    Access Source Terminal
                                                    <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
