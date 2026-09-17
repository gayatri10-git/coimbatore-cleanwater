import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { api } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (role: UserRole) => Promise<void>;
}

// Fallback mock accounts matching seed_db.json
const DEMO_PERSONAS: Record<UserRole, User> = {
  citizen: {
    id: 1,
    email: "citizen@cleanh2o.demo",
    full_name: "Gayatri Tanisha Bitasta",
    role: "citizen",
    phone: "+91 98421 11234",
    is_active: true,
    created_at: "2026-09-16 02:07:26.961892",
  },
  staff: {
    id: 2,
    email: "staff@cleanh2o.demo",
    full_name: "Dr. Suseela (Assistant Engineer, CCMC)",
    role: "staff",
    phone: "+91 94432 55890",
    is_active: true,
    created_at: "2026-09-16 02:07:26.961892",
  },
  admin: {
    id: 3,
    email: "admin@cleanh2o.demo",
    full_name: "ICCC (Integrated Command & Control Centre, CCMC)",
    role: "admin",
    phone: "+91 422 230 0001",
    is_active: true,
    created_at: "2026-09-16 02:07:26.961892",
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("cleanwater_user");
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn("Could not read cleanwater_user from localStorage", e);
    }
    return DEMO_PERSONAS.citizen;
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("cleanwater_jwt_token");
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      let savedToken: string | null = null;
      try {
        savedToken = localStorage.getItem("cleanwater_jwt_token");
      } catch {}

      if (savedToken) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          try {
            localStorage.setItem("cleanwater_user", JSON.stringify(profile));
          } catch {}
        } catch {
          // Token expired or server unreachable, fallback to default citizen demo user
          setUser((prev) => prev || DEMO_PERSONAS.citizen);
        }
      } else {
        // Log in default citizen demo user to authenticate against backend API
        try {
          const res = await api.login("citizen@cleanh2o.demo", "citizen123");
          setUser(res.user);
          setToken(res.access_token);
        } catch {
          // If network error during boot, use local citizen persona
          setUser(DEMO_PERSONAS.citizen);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { email: string; password: string; full_name: string; phone?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  const quickSwitchUser = async (role: UserRole) => {
    // 1. Immediately switch the state to guarantee immediate navigation & UI responsiveness
    const targetUser = DEMO_PERSONAS[role];
    setUser(targetUser);
    try {
      localStorage.setItem("cleanwater_user", JSON.stringify(targetUser));
    } catch {}

    // 2. Synchronize token with backend API in background / await response
    try {
      const creds: Record<UserRole, { email: string; pass: string }> = {
        citizen: { email: "citizen@cleanh2o.demo", pass: "citizen123" },
        staff: { email: "staff@cleanh2o.demo", pass: "staff123" },
        admin: { email: "admin@cleanh2o.demo", pass: "admin123" },
      };
      const { email, pass } = creds[role];
      const res = await api.login(email, pass);
      setUser(res.user);
      setToken(res.access_token);
      try {
        localStorage.setItem("cleanwater_jwt_token", res.access_token);
        localStorage.setItem("cleanwater_user", JSON.stringify(res.user));
      } catch {}
    } catch (err) {
      console.warn("Backend auth switch sync failed, running with local persona credentials:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        quickSwitchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
