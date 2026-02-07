import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import Hero from "@/components/Hero";
import IncidentCard, { Incident } from "@/components/IncidentCard";
import ReportForm from "@/components/ReportForm";
import HowItWorks from "@/components/HowItWorks";
import RealHeatmap from "@/components/RealHeatmap";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

import {
  Shield,
  AlertCircle,
  LogIn,
  LogOut,
  Settings,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "http://localhost:4000/api";

export default function Index() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const [showReportForm, setShowReportForm] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  /* ---------------------------
     LOAD PUBLIC INCIDENTS
  ---------------------------- */
  useEffect(() => {
    fetchIncidents();
  }, []);

  async function fetchIncidents() {
    setLoadingIncidents(true);

    try {
      const resp = await fetch(`${API_BASE}/incidents/public`);
      const data = await resp.json();

      setIncidents(
        (data || []).map((item: any) => ({
          id: item._id,
          type: item.type,
          title: item.title,
          description: item.description,
          location: item.location,
          imageUrl: item.imageUrl || null,
          timestamp: new Date(item.createdAt),
        }))
      );
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoadingIncidents(false);
    }
  }

  /* ---------------------------
     SMOOTH SCROLL
  ---------------------------- */
  const scrollToReports = () => {
    requestAnimationFrame(() => {
      const target = document.getElementById("recent-reports");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  /* ---------------------------
     CREATE INCIDENT
  ---------------------------- */
  async function handleNewReport(report: any) {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to report.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    let imageUrl: string | null = null;

    if (report.imageFile) {
      const form = new FormData();
      form.append("image", report.imageFile);

      try {
        const token = localStorage.getItem("token");
        const uploadResp = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });

        const uploadData = await uploadResp.json();

        if (!uploadResp.ok) {
          toast({
            title: "Upload failed",
            description: uploadData.message || "Could not upload image",
            variant: "destructive",
          });
          return;
        }

        imageUrl = uploadData.url || uploadData.imageUrl || null;
      } catch {
        toast({ title: "Upload failed", variant: "destructive" });
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");

      const resp = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...report,
          latitude: report.latitude ?? null,
          longitude: report.longitude ?? null,
          imageUrl,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        toast({
          title: "Failed to report",
          description: data.message || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Report submitted",
        description: "Pending admin approval.",
      });

      setShowReportForm(false);
      fetchIncidents();
    } catch {
      toast({ title: "Failed to report", variant: "destructive" });
    }
  }

  const handleSignOut = () => {
    signOut();
    toast({ title: "Signed out" });
  };

  /* ---------------------------
     RENDER
  ---------------------------- */
  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="rounded p-1 bg-gradient-to-tr from-blue-600 to-cyan-400">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <span className="text-xl font-semibold">SafetyWatch</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}

            {user ? (
              <>
                <Button
                  className="bg-blue-600 text-white"
                  onClick={() => setShowReportForm(true)}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Report Incident
                </Button>

                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <Hero
        onReportClick={() =>
          user ? setShowReportForm(true) : navigate("/auth")
        }
        onViewReports={scrollToReports}
      />

      {/* MAIN */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">
            <section
              id="recent-reports"
              className="bg-card border rounded-xl p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold mb-4">
                Recent Reports
              </h3>

              {loadingIncidents ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
                </div>
              ) : incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">
                  No incidents yet — be the first to report.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {incidents.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                    />
                  ))}
                </div>
              )}
            </section>

            <HowItWorks />
          </div>

          {/* RIGHT */}
          <aside className="space-y-6">
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold mb-3">Live Heatmap</h4>
              <RealHeatmap />
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white rounded-xl p-4 shadow">
              <h4 className="text-lg font-semibold">Quick Actions</h4>
              <p className="text-sm opacity-90 my-2">
                Report incidents fast or view recent alerts.
              </p>

              <div className="flex gap-2">
                <Button
                  className="bg-white text-blue-600"
                  onClick={() =>
                    user
                      ? setShowReportForm(true)
                      : navigate("/auth")
                  }
                >
                  Report Now
                </Button>

                <Button variant="ghost" onClick={scrollToReports}>
                  View Recent
                </Button>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold">Community</h4>
              <p className="text-sm text-muted-foreground">
                Join the SafetyWatch community to receive
                notifications and help keep your neighborhood safe.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />

      {/* REPORT FORM */}
      <AnimatePresence>
        {showReportForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <ReportForm
              onClose={() => setShowReportForm(false)}
              onSubmit={handleNewReport}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
