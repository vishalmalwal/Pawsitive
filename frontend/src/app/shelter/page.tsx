"use client";
import { useAuth } from "@/app/layout";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ShelterDashboard() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", species: "", description: "", traits_description: "" });

  const addPet = async () => {
    await fetch(`${API}/pets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`
      },
      body: JSON.stringify(form)
    });
    alert("Pet added!");
    setForm({ name: "", species: "", description: "", traits_description: "" });
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Shelter Dashboard</h1>
      <div className="mt-8 max-w-2xl">
        <input placeholder="Name" className="border p-2 w-full mb-4" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="Species" className="border p-2 w-full mb-4" value={form.species} onChange={e => setForm({...form, species: e.target.value})} />
        <textarea placeholder="Description" className="border p-2 w-full mb-4" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <textarea placeholder="Traits (for matching)" className="border p-2 w-full mb-4" rows={6} value={form.traits_description} onChange={e => setForm({...form, traits_description: e.target.value})} />
        <button onClick={addPet} className="bg-green-600 text-white px-6 py-3 rounded">Add Pet</button>
      </div>
    </div>
  );
}