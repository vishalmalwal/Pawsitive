"use client";
import { useAuth } from "@/app/layout";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Swipe() {
  const { user } = useAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [report, setReport] = useState("");

  useEffect(() => {
    fetch(`${API}/matches`, {
      headers: { Authorization: `Bearer ${user?.access_token}` }
    }).then(r => r.json()).then(setPets);
  }, []);

  const apply = async () => {
    await fetch(`${API}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`
      },
      body: JSON.stringify({ pet_id: pets[current].id })
    });
    next();
  };

  const next = () => setCurrent(c => c + 1);

  if (pets.length === 0) return <p className="text-center mt-20">No matches yet — set your lifestyle!</p>;
  if (current >= pets.length) return <p className="text-center mt-20">No more pets 😿</p>;

  const pet = pets[current];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center">{pet.name}</h2>
        <p className="text-xl text-gray-600 text-center">{pet.species}</p>
        <p className="mt-4 text-gray-700">{pet.description}</p>
        <p className="text-sm text-gray-500 mt-2">Similarity: {(pet.similarity * 100).toFixed(1)}%</p>

        <div className="flex justify-center gap-12 mt-8">
          <button onClick={next} className="bg-red-500 text-white w-16 h-16 rounded-full text-4xl">✗</button>
          <button onClick={apply} className="bg-green-500 text-white w-16 h-16 rounded-full text-4xl">❤️</button>
        </div>
      </div>
    </div>
  );
}