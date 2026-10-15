"use client";

import { useState } from "react";

export default function TestApi() {
  const [texte, setTexte] = useState("");
  const [resultat, setResultat] = useState("");

  async function envoyer(contenu: object) {
    const reponse = await fetch("/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contenu),
    });
    const donnees = await reponse.json();
    setResultat(`Statut ${reponse.status}\n${JSON.stringify(donnees, null, 2)}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Test de la route POST /api/hello</h1>

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Saisissez un texte…"
        className="mt-4 h-32 w-full rounded border p-2"
      />

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => envoyer({ texte })}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Envoyer le texte
        </button>
        <button
          onClick={() => envoyer({})}
          className="rounded bg-gray-600 px-4 py-2 text-white"
        >
          Envoyer une requête vide
        </button>
      </div>

      {resultat && (
        <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm text-gray-800">
          {resultat}
        </pre>
      )}
    </main>
  );
}