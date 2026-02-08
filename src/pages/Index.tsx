import { useState, useEffect, useCallback } from "react";
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
  User,
  Users,
  Star,
  MapPin,
  Clock,
  LayoutDashboard,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import SafetyPulse from "@/components/SafetyPulse";
import GuardianMode from "@/components/GuardianMode";
import NewsFeed from "@/components/NewsFeed";
import { Badge } from "@/components/ui/badge";
import IncidentCarousel from "@/components/IncidentCarousel";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const API_BASE = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/api";

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [showReportForm, setShowReportForm] = useState(false);
  const [popularIncidents, setPopularIncidents] = useState<Incident[]>([]);
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [myReports, setMyReports] = useState<Incident[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);

  /* ---------------------------
     FETCH FOCUSED INCIDENT
  ---------------------------- */
  const fetchFocusedIncident = useCallback(async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE}/incidents/${id}`, {
        headers: { "x-app-version": "1.4.2" }
      });
      if (resp.ok) {
        const data = await resp.json();
        setFocusedIncident(mapIncident(data));
      }
    } catch (err) {
      console.error("Failed to fetch focused incident:", err);
    }
  }, []);
  const fetchPopular = useCallback(async () => {
    setLoadingPopular(true);
    try {
      const resp = await fetch(`${API_BASE}/incidents/popular`, {
        headers: { "x-app-version": "1.4.2" }
      });
      const data = await resp.json();
      const filtered = (data || []).map(mapIncident).filter((i: Incident) =>
        (i.status === 'approved' || i.isImportant) && i.status !== 'problem solved'
      );
      setPopularIncidents(filtered);
    } catch (err) {
      console.error("Failed to fetch popular incidents:", err);
    } finally {
      setLoadingPopular(false);
    }
  }, []);

  /* ---------------------------
     FETCH NEARBY INCIDENTS
  ---------------------------- */
  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingNearby(true);
    try {
      const resp = await fetch(`${API_BASE}/incidents/near-me?lat=${lat}&lng=${lng}&radius=10`, {
        headers: { "x-app-version": "1.4.2" }
      });
      const data = await resp.json();
      const filtered = (data || []).map(mapIncident).filter((i: Incident) =>
        (i.status === 'approved' || i.isImportant) && i.status !== 'problem solved'
      );
      setNearbyIncidents(filtered);
    } catch (err) {
      console.error("Failed to fetch nearby incidents:", err);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  /* ---------------------------
     FETCH MY REPORTS
  ---------------------------- */
  const fetchMyReports = useCallback(async () => {
    if (!user) return;
    setLoadingMyReports(true);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/incidents/my-reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-app-version": "1.4.2"
        }
      });
      const data = await resp.json();
      setMyReports((data || []).map(mapIncident));
    } catch (err) {
      console.error("Failed to fetch my reports:", err);
    } finally {
      setLoadingMyReports(false);
    }
  }, [user]);

  function mapIncident(item: any): Incident {
    return {
      id: item._id,
      userId: item.userId?._id || item.userId || "",
      type: item.type,
      title: item.title,
      description: item.description,
      location: item.location,
      imageUrl: item.imageUrl || null,
      timestamp: new Date(item.createdAt),
      status: item.status,
      isImportant: item.isImportant
    };
  }

  useEffect(() => {
    fetchPopular();
    if (user) fetchMyReports();

    const params = new URLSearchParams(location.search);
    const incidentId = params.get("incident");
    if (incidentId) {
      fetchFocusedIncident(incidentId);
    }

    // Attempt to get user location for Nearby section
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          fetchNearby(loc.lat, loc.lng);
        },
        () => console.log("Location access denied")
      );
    }
  }, [user, fetchPopular, fetchMyReports, fetchNearby, fetchFocusedIncident, location.search]);

  /* ---------------------------
     SCROLL HANDLERS
  ---------------------------- */
  useEffect(() => {
    if (location.state?.scrollTo) {
      setTimeout(() => {
        const target = document.getElementById(location.state.scrollTo);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const scrollToMyReports = () => {
    document.getElementById("tracking-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------------------------
     HANDLE NEW REPORT
  ---------------------------- */
  async function handleNewReport(report: any) {
    if (!user) {
      toast({ title: "Login Required", description: "Please sign in to report.", variant: "destructive" });
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
          headers: {
            Authorization: `Bearer ${token}`,
            "x-app-version": "1.4.2"
          },
          body: form,
        });
        const uploadData = await uploadResp.json();
        imageUrl = uploadData.url || uploadData.imageUrl || null;
      } catch (err: any) {
        throw new Error(err.message || "Upload failed");
      }
    }

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ ...report, imageUrl }),
      });
      if (!resp.ok) throw new Error("Failed to submit");
      toast({ title: "Success", description: "Incident reported successfully" });
      setShowReportForm(false);
      fetchMyReports(); // Update tracking section
    } catch (err: any) {
      throw err;
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SafetyPulse />

      {/* HERO */}
      <Hero
        onReportClick={() => user ? setShowReportForm(true) : navigate("/auth")}
        onViewReports={() => document.getElementById("popular-section")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* MAIN */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* LEFT: MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-12 sm:space-y-16">

            {/* 1. POPULAR INCIDENTS */}
            <section id="popular-section" className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-orange-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">
                    <Star className="h-3.5 w-3.5 fill-orange-500" /> Administrative Alerts
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black">Popular Incidents</h3>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">Critical reports verified and highlighted by local authorities.</p>
                </div>
                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/20" />
              </div>

              {loadingPopular ? (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-64 bg-card border rounded-2xl"></div>)}
                </div>
              ) : popularIncidents.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-muted/10 rounded-2xl border">
                  <p className="text-muted-foreground text-sm">No popular incidents currently featured.</p>
                </div>
              ) : (
                <IncidentCarousel incidents={popularIncidents} />
              )}
            </section>

            {/* 2. INCIDENTS NEAR YOU */}
            <section id="nearby-section" className="space-y-6 sm:space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">
                    <MapPin className="h-3.5 w-3.5" /> Neighborhood Watch
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black">Near Your Location</h3>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">Incidents reported within a 10km radius of your current position.</p>
                </div>
              </div>

              {!userLocation ? (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 sm:p-10 text-center">
                  <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base font-medium mb-6">Location services are required to see nearby incidents.</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Enable Location</Button>
                </div>
              ) : loadingNearby ? (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-64 bg-card border rounded-2xl"></div>)}
                </div>
              ) : nearbyIncidents.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-muted/10 rounded-2xl border">
                  <p className="text-muted-foreground text-sm">No incidents reported near you. Stay safe!</p>
                </div>
              ) : (
                <IncidentCarousel incidents={nearbyIncidents} />
              )}
            </section>

            {/* 3. REPORT TRACKING (FOR LOGGED IN USERS) */}
            {user && (
              <section id="tracking-section" className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">
                        <Clock className="h-3.5 w-3.5" /> Live Updates
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black">Report Tracking</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/profile")}
                      className="text-muted-foreground hover:text-primary w-fit p-0 sm:p-2"
                    >
                      View All Reports <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  {loadingMyReports ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
                    </div>
                  ) : myReports.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 border border-dashed rounded-xl">
                      <p className="text-muted-foreground text-sm font-medium mb-4">You haven't reported any incidents yet.</p>
                      <Button size="sm" onClick={() => setShowReportForm(true)}>File Your First Report</Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                      {myReports.slice(0, 2).map((inc) => (
                        <IncidentCard key={inc.id} incident={inc} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <HowItWorks />
          </div>

          {/* RIGHT: ASIDE */}
          <aside className="space-y-10">
            <NewsFeed />

            <div className="bg-card border rounded-2xl p-6 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="h-24 w-24" />
              </div>
              <h4 className="text-xl font-black mb-6 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Live Heatmap
              </h4>
              <div className="rounded-xl overflow-hidden border">
                <RealHeatmap />
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 text-center font-bold tracking-widest uppercase">
                Interactive Density Analysis
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] opacity-50"></div>
              <h4 className="text-2xl font-black relative z-10">Strategic Center</h4>
              <p className="text-sm text-balance my-4 opacity-90 relative z-10 leading-relaxed">
                Access critical safety tools or contribute to the community safety network.
              </p>

              <div className="flex flex-col gap-3 mt-6 relative z-10">
                <Button
                  className="bg-white text-blue-600 hover:bg-white/90 font-bold h-12 rounded-xl border-none shadow-lg"
                  onClick={() => user ? setShowReportForm(true) : navigate("/auth")}
                >
                  Instant Report
                </Button>

                <Button variant="ghost" className="text-white hover:bg-white/10 font-bold h-12 rounded-xl" onClick={scrollToMyReports}>
                  Track Status
                </Button>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-xl font-black mb-2">Community First</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Join thousands of citizens keeping their neighborhoods safe through collaborative vigilance and real-time reporting.
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
            className="z-[100]"
          >
            <ReportForm
              onClose={() => setShowReportForm(false)}
              onSubmit={handleNewReport}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <GuardianMode />

      {/* Deep linked incident dialog */}
      {focusedIncident && (
        <div className="hidden">
          <IncidentCard
            incident={focusedIncident}
            defaultOpen={true}
            onDialogStateChange={(open) => {
              if (!open) {
                setFocusedIncident(null);
                navigate("/", { replace: true });
              }
            }}
          />
        </div>
      )}
    </motion.div >
  );
}
