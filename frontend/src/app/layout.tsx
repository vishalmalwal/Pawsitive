"use client"

import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = { user: any; loading: boolean; logout: () => void };
const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: () => {} });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_OUT") router.push("/login");
    });

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <html lang="en">
      <body>
        <AuthContext.Provider value={{ user, loading, logout }}>
          {children}
        </AuthContext.Provider>
      </body>
    </html>
  );
}

export const useAuth = () => useContext(AuthContext);