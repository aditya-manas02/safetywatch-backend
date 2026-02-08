import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import Navbar from "./components/Navbar";
import { useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ChatBot from "./components/ChatBot";
import AnimatedBackground from "./components/AnimatedBackground";
import { lazy, Suspense, useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";
import { SafetyWatchLoader } from "./components/SafetyWatchLoader";

// Lazy load pages for performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Support = lazy(() => import("./pages/Support"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const NotFound = lazy(() => import("./pages/NotFound"));



const AppContent = () => {
  const location = useLocation();
  const hideNavbar = ["/admin", "/auth"].some(path => location.pathname.startsWith(path));

  const { isLoading } = useAuth();
  const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimePassed(true);
    }, 5000); // 5 seconds minimum load time
    return () => clearTimeout(timer);
  }, []);

  // Handle Hardware Back Button
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are on the text root path or auth page, ask to exit
      if (location.pathname === '/' || location.pathname === '/auth') {
        const confirmExit = window.confirm("Do you want to exit SafetyWatch?");
        if (confirmExit) {
          CapacitorApp.exitApp();
        }
      } else {
        // Otherwise go back in history
        window.history.back();
      }
    });

    return () => {
      backListener.then(handler => handler.remove());
    };
  }, [location.pathname]);

  if (isLoading || !minLoadTimePassed) {
    return <SafetyWatchLoader />;
  }

  return (
    <AnimatedBackground>
      {!hideNavbar && <Navbar />}
      <main className={!hideNavbar ? "pt-[64px] md:pt-[72px]" : ""}>
        <Suspense fallback={<SafetyWatchLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/support"
              element={
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        {!location.pathname.startsWith("/inbox") && <ChatBot />}
      </Suspense>
    </AnimatedBackground >
  );
};

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    SplashScreen.hide().catch(err => console.warn("SplashScreen hide failed:", err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </GlobalErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
