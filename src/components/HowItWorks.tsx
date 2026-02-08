// src/components/HowItWorks.tsx
import React from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck, BellRing } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      title: "Report",
      desc: "Quickly submit incident details and optionally add a photo or location.",
      icon: Send,
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      title: "Moderation",
      desc: "Reports are reviewed by admins and verified for accuracy.",
      icon: ShieldCheck,
      color: "bg-emerald-500/10 text-emerald-600"
    },
    {
      title: "Notify",
      desc: "Community members receive real-time notifications and updates.",
      icon: BellRing,
      color: "bg-amber-500/10 text-amber-600"
    },
  ];

  return (
    <section id="how-it-works" className="bg-card border rounded-xl p-8 shadow-sm">
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight">How SafetyWatch works</h3>
        <p className="text-sm text-muted-foreground mt-1">Our simple three-step process to keep your neighborhood secure.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            viewport={{ once: true }}
            className="p-6 border rounded-xl hover:shadow-md transition-shadow bg-background/50"
          >
            <div className={`h-12 w-12 rounded-xl ${s.color} flex items-center justify-center mb-4`}>
              <s.icon className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-lg mb-2">{s.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
