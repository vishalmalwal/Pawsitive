"use client";

import { useAuth } from "@/app/layout";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Swipe() {
  const { user, token } = useAuth();  // Now getting token from context
  const [pets, setPets] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setError("Not logged in — please log in again");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Missing access token — try logging out and back in");
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        console.log("Fetching matches with token:", token.slice(0, 10) + "...");
        const res = await fetch(`${API}/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Backend error ${res.status}: ${text}`);
        }

        const data = await res.json();
        console.log("Matches received:", data);
        setPets(data);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch matches — check console");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, token]);  // Depend on token too

  const apply = async () => {
    if (!pets[currentIndex] || !token) return;
    try {
      await fetch(`${API}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pet_id: pets[currentIndex].id }),
      });
      alert("Application submitted! 🐾");
    } catch (err) {
      alert("Failed to apply");
    }
    setCurrentIndex(prev => prev + 1);
  };

  const nextPet = () => setCurrentIndex(prev => prev + 1);

  if (loading) return <p className="text-center mt-20 text-xl">Loading matches...</p>;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <p className="text-2xl text-red-500 mb-4">{error}</p>
      <p className="mb-8">Open console (F12) for more details</p>
      <Link href="/adopter" className="text-blue-600 underline text-xl">
        ← Back to dashboard
      </Link>
    </div>
  );

  if (pets.length === 0 || currentIndex >= pets.length)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-2xl mb-8">No matches yet 😿</p>
        <p className="mb-4">Make sure:</p>
        <ul className="text-left mb-8 list-disc">
          <li>You saved your lifestyle</li>
          <li>There are pets added by a shelter</li>
        </ul>
        <Link href="/adopter" className="text-blue-600 underline text-xl">
          ← Back to dashboard
        </Link>
      </div>
    );

  const pet = pets[currentIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full">
        <h2 className="text-4xl font-bold text-center text-purple-800 mb-2">{pet.name}</h2>
        <p className="text-2xl text-center text-gray-600 mb-6">{pet.species}</p>
        <p className="text-lg text-gray-700 mb-6 text-center">{pet.description}</p>
        <p className="text-center text-sm text-gray-500 mb-8">
          Match Score: <span className="font-bold text-purple-600">{(pet.similarity * 100).toFixed(1)}%</span>
        </p>

        <div className="flex justify-center gap-16">
          <button onClick={nextPet} className="bg-red-500 hover:bg-red-600 text-white text-5xl w-20 h-20 rounded-full shadow-lg transition">
            ✗
          </button>
          <button onClick={apply} className="bg-green-500 hover:bg-green-600 text-white text-5xl w-20 h-20 rounded-full shadow-lg transition">
            ❤️
          </button>
        </div>

        <div className="mt-10 text-center">
          <Link href="/adopter" className="text-purple-600 underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}