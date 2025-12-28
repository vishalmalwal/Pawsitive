"use client";
import { useAuth } from "@/app/layout";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdopterDashboard() {
  const { user } = useAuth();
  const [lifestyle, setLifestyle] = useState("");

  const saveLifestyle = async () => {
    await fetch(`${API}/profile/lifestyle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`
      },
      body: JSON.stringify({ lifestyle_description: lifestyle })
    });
    alert("Lifestyle saved! You can now swipe.");
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Welcome, Adopter!</h1>
      <div className="mt-8 max-w-2xl">
        <label className="block text-lg font-medium">Describe your lifestyle</label>
        <textarea
          className="w-full border rounded p-4 mt-2"
          rows={6}
          placeholder="e.g. Active family with kids, big yard, love hiking..."
          value={lifestyle}
          onChange={e => setLifestyle(e.target.value)}
        />
        <button onClick={saveLifestyle} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded">
          Save & Start Matching
        </button>
        <Link href="/swipe" className="block mt-6 text-blue-600 underline text-center text-xl">
          Go to Swipe →
        </Link>
      </div>
    </div>
  );
}