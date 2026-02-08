import { useState, useEffect, createContext, useContext, ReactNode } from "react";



interface UserData {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  roles: string[];
}

export interface RateLimitInfo {
  remaining: number;
  resetIn: string;
  total: number;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null; rateLimit?: RateLimitInfo }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<{ error: Error | null; tempPassword?: string; rateLimit?: RateLimitInfo }>;
  verifyOtp: (email: string, otp: string) => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null; rateLimit?: RateLimitInfo }>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setToken(savedToken);
        setIsAdmin(parsed.roles?.includes("admin"));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    setIsLoading(false);
  }, []);

  // ---------------------------
  // SIGN UP (Node backend)
  // ---------------------------
  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    console.log("Auth API Call [SignUp] using Base URL:", baseUrl || "UNDEFINED (Falling back to window.origin or failing)");

    if (!baseUrl || baseUrl === window.location.origin) {
      console.warn("CRITICAL: VITE_API_BASE_URL is missing! Requests may fail on production.");
    }

    try {
      const resp = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ email, password, name, phone }),
      });

      const data = await resp.json();
      if (!resp.ok) return {
        error: new Error(data.message || "Sign-up failed"),
        rateLimit: data.rateLimit
      };

      return { error: null, rateLimit: data.rateLimit };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      return { error };
    }
  };

  // ---------------------------
  // SIGN IN (Node backend)
  // ---------------------------
  const signIn = async (email: string, password: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!baseUrl || baseUrl === window.location.origin) {
      return { error: new Error("Server configuration error: Base API URL is missing.") };
    }

    try {
      const resp = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return {
          error: new Error(data.message || "Login failed"),
          needsVerification: data.needsVerification
        };
      }

      // Save token + user
      setToken(data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setIsAdmin(data.user.roles?.includes("admin"));

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      return { error };
    }
  };

  // ---------------------------
  // VERIFY OTP
  // ---------------------------
  const verifyOtp = async (email: string, otp: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl || baseUrl === window.location.origin) {
      return { error: new Error("Server configuration error: Base API URL is missing.") };
    }

    try {
      const resp = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await resp.json();
      if (!resp.ok) return { error: new Error(data.message || "Verification failed") };

      // Save token + user
      setToken(data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setIsAdmin(data.user.roles?.includes("admin"));

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      return { error };
    }
  };

  // ---------------------------
  // RESEND OTP
  // ---------------------------
  const resendOtp = async (email: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl || baseUrl === window.location.origin) {
      return { error: new Error("Server configuration error: Base API URL is missing.") };
    }

    try {
      const resp = await fetch(`${baseUrl}/api/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();
      if (!resp.ok) return {
        error: new Error(data.message || "Failed to resend OTP"),
        rateLimit: data.rateLimit
      };

      return { error: null, rateLimit: data.rateLimit };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      return { error };
    }
  };

  // ---------------------------
  // FORGOT PASSWORD
  // ---------------------------
  const forgotPassword = async (email: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl || baseUrl === window.location.origin) {
      return { error: new Error("Server configuration error: Base API URL is missing.") };
    }

    try {
      const resp = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-version": "1.4.2"
        },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();
      if (!resp.ok) return {
        error: new Error(data.details || data.message || "Request failed"),
        rateLimit: data.rateLimit
      };

      return { error: null, rateLimit: data.rateLimit };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      return { error };
    }
  };


  // ---------------------------
  // SIGN OUT
  // ---------------------------
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    // Absolute Redirection: Force full page reload to clear all React state
    window.location.href = "/auth";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin,
        isLoading,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        verifyOtp,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
