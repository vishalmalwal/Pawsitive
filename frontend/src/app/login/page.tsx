"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/layout";  // Our auth context from layout.tsx

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"adopter" | "shelter">("adopter");
  const [isSignup, setIsSignup] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { user_type: userType } },
      });
      if (error) {
        alert(error.message);
      } else {
        alert("Check your email for the confirmation link!");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else if (data.user?.email_confirmed_at) {
        const type = data.user.user_metadata.user_type || "adopter";
        router.push(type === "shelter" ? "/shelter" : "/adopter");
      } else {
        alert("Please confirm your email first!");
      }
    }
  };

  // Auto-redirect if already logged in and verified
  if (user?.email_confirmed_at) {
    const type = user.user_metadata?.user_type || "adopter";
    router.push(type === "shelter" ? "/shelter" : "/adopter");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">
          Pawsitive 🐾
        </h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-4 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-4 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value as "adopter" | "shelter")}
            className="w-full p-4 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="adopter">I'm an Adopter</option>
            <option value="shelter">I'm a Shelter</option>
          </select>

          <button
            type="submit"
            className="w-full p-4 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 transition mb-4"
          >
            {isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full text-center text-purple-600 font-medium"
        >
          {isSignup ? "Already have an account? Login" : "New here? Sign Up"}
        </button>
      </div>
    </div>
  );
}