"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user || !data.user.email_confirmed_at) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Logged in as {user?.email}</p>

      {/* Later:
          - adopter: care roadmap
          - shelter: analytics
      */}
    </div>
  );
}
