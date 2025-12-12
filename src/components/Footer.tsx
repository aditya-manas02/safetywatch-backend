// src/components/Footer.tsx
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h4 className="font-bold text-lg">SafetyWatch</h4>
          <p className="text-sm text-slate-600 max-w-sm mt-2">
            Helping communities stay aware, connected and safe. Built with care.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium">Product</h5>
            <ul className="text-sm text-slate-600 mt-2 space-y-1">
              <li>Features</li>
              <li>Pricing</li>
              <li>Security</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium">Company</h5>
            <ul className="text-sm text-slate-600 mt-2 space-y-1">
              <li>About</li>
              <li>Contact</li>
              <li>Terms</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} SafetyWatch — All rights reserved.
      </div>
    </footer>
  );
}
