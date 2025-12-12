import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface UserData {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: UserData | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setIsAdmin(parsed.roles?.includes("admin"));
    }

    setIsLoading(false);
  }, []);

  // ---------------------------
  // SIGN UP (Node backend)
  // ---------------------------
  const signUp = async (email: string, password: string) => {
    try {
      const resp = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();
      if (!resp.ok) return { error: new Error(data.message || "Sign-up failed") };

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ---------------------------
  // SIGN IN (Node backend)
  // ---------------------------
  const signIn = async (email: string, password: string) => {
    try {
      const resp = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();
      if (!resp.ok) return { error: new Error(data.message || "Login failed") };

      // Save token + user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setIsAdmin(data.user.roles?.includes("admin"));

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ---------------------------
  // SIGN OUT
  // ---------------------------
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        signUp,
        signIn,
        signOut,
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
