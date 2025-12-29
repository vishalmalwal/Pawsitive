"use client";

import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: any;
  token: string | null;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  logout: () => {},
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <html lang="en">
      <body>
        <AuthContext.Provider value={{ user, token, loading, logout }}>
          {children}
        </AuthContext.Provider>
      </body>
    </html>
  );
}

export const useAuth = () => useContext(AuthContext);