"use client";

import { useAuth } from "@/app/layout";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ShelterDashboard() {
  const { token } = useAuth();  // <-- Use token from context
  const [form, setForm] = useState({
    name: "",
    species: "",
    description: "",
    traits_description: "",
  });
  const [message, setMessage] = useState("");

  const addPet = async () => {
    if (!token) {
      setMessage("Not authenticated — please log out and back in");
      return;
    }

    try {
      const res = await fetch(`${API}/pets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,  // <-- Critical: send token
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      setMessage("Pet added successfully! 🐾");
      setForm({ name: "", species: "", description: "", traits_description: "" });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      console.error("Add pet error:", err);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-100 to-pink-100">
      <h1 className="text-4xl font-bold text-purple-800 mb-8">Shelter Dashboard</h1>

      {message && (
        <p className={`text-xl mb-6 ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-2xl">
        <input
          placeholder="Pet Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full p-4 border rounded-lg mb-4"
        />
        <input
          placeholder="Species"
          value={form.species}
          onChange={(e) => setForm({ ...form, species: e.target.value })}
          className="w-full p-4 border rounded-lg mb-4"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4}
          className="w-full p-4 border rounded-lg mb-4"
        />
        <textarea
          placeholder="Traits for matching (e.g., calm, playful, good with kids)"
          value={form.traits_description}
          onChange={(e) => setForm({ ...form, traits_description: e.target.value })}
          rows={6}
          className="w-full p-4 border rounded-lg mb-6"
        />

        <button
          onClick={addPet}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg"
        >
          Add Pet
        </button>
      </div>
    </div>
  );
}