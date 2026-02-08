import { useRef, useState, useEffect } from "react";
import IncidentCard, { Incident } from "./IncidentCard";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface IncidentCarouselProps {
    incidents: Incident[];
}

export default function IncidentCarousel({ incidents }: IncidentCarouselProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    // Cinematic Autoplay: 4s delay, continuous but pauses on hover
    const plugin = useRef(
        Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    useEffect(() => {
        if (!api) return;

        setCurrent(api.selectedScrollSnap());
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    if (!incidents || incidents.length === 0) return null;

    return (
        <div className="relative w-full px-0 group/carousel">
            {/* Spotlight Glow Effect for Active Card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[80%] bg-primary/5 blur-[120px] rounded-full pointer-events-none opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-1000" />

            <Carousel
                setApi={setApi}
                plugins={[plugin.current]}
                className="w-full"
                opts={{
                    align: "center",
                    loop: true,
                    skipSnaps: false,
                    duration: 50, // SLIGHTLY SLOWER FOR PREMIUM FEEL
                    dragFree: false,
                }}
            >
                <CarouselContent className="-ml-4 md:-ml-10">
                    {incidents.map((inc, index) => {
                        const isActive = index === current;
                        return (
                            <CarouselItem
                                key={inc.id}
                                className="pl-4 md:pl-10 basis-[92%] sm:basis-[75%] lg:basis-[55%] xl:basis-[50%] z-0"
                                style={{
                                    zIndex: isActive ? 10 : 0,
                                }}
                            >
                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: isActive ? 1.05 : 0.85,
                                        opacity: isActive ? 1 : 0.4,
                                        filter: isActive ? 'blur(0px)' : 'blur(1px)',
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        ease: [0.32, 0.72, 0, 1], // Professional boutique easing
                                    }}
                                    className={cn(
                                        "py-12 h-full transition-shadow duration-700",
                                        isActive ? "drop-shadow-[0_20px_50px_rgba(30,58,138,0.25)]" : "drop-shadow-none"
                                    )}
                                >
                                    <IncidentCard incident={inc} />
                                </motion.div>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>

                {/* Custom Navigation Controls - Industry Level Positioning */}
                <div className="hidden md:flex items-center gap-4 absolute -top-24 right-4 z-20">
                    <CarouselPrevious className="static translate-y-0 opacity-100 bg-background/60 backdrop-blur-xl border-border/50 hover:bg-primary hover:text-white transition-all size-14 rounded-2xl shadow-2xl group/prev" />
                    <CarouselNext className="static translate-y-0 opacity-100 bg-background/60 backdrop-blur-xl border-border/50 hover:bg-primary hover:text-white transition-all size-14 rounded-2xl shadow-2xl group/next" />
                </div>

                {/* Mobile Inline Controls */}
                <div className="flex sm:hidden justify-center gap-8 mt-2 relative z-10 pb-6">
                    <CarouselPrevious className="static translate-y-0 opacity-100 bg-card/90 backdrop-blur-md border-primary/20 size-12 rounded-full shadow-xl" />
                    <CarouselNext className="static translate-y-0 opacity-100 bg-card/90 backdrop-blur-md border-primary/20 size-12 rounded-full shadow-xl" />
                </div>
            </Carousel>
        </div>
    );
}

