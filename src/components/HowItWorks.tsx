// src/components/HowItWorks.tsx
import React from "react";

export default function HowItWorks() {
  const steps = [
    { title: "Report", desc: "Quickly submit incident details and optionally add a photo or location." },
    { title: "Moderation", desc: "Reports are reviewed by admins and verified for accuracy." },
    { title: "Notify", desc: "Community members receive real-time notifications and updates." },
  ];

  return (
    <section className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">How SafetyWatch works</h3>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, idx) => (
          <div key={idx} className="p-4 border rounded-lg">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
              {idx + 1}
            </div>
            <h4 className="font-semibold">{s.title}</h4>
            <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
