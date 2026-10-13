"use client";

import { useState } from "react";
import Link from "next/link";
import AffichageFiche from "@/components/AffichageFiche";
import { LIMITES, type FicheEnregistree } from "@/lib/fiche";

export default function FormulaireFiche() {
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fiche, setFiche] = useState<FicheEnregistree | null>(null);

  const texteValide =
    texte.length >= LIMITES.texteMin && texte.length <= LIMITES.texteMax;
  const formulaireValide = titre.trim() !== "" && texteValide;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setFiche(null);

    try {
      const reponse = await fetch("/api/fiches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, texte }),
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.erreur ?? "Une erreur est survenue.");
        return;
      }

      setFiche(donnees);
      setTitre("");
      setTexte("");
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div>
          <label htmlFor="titre" className="block font-medium">
            Titre du cours
          </label>
          <input
            id="titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            maxLength={LIMITES.titreMax}
            placeholder="Exemple : Introduction au Cloud Computing"
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label htmlFor="texte" className="block font-medium">
            Texte du cours
          </label>
          <textarea
            id="texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Collez ici le contenu de votre cours…"
            className="mt-1 h-64 w-full rounded border p-2"
          />
          <p
            className={`mt-1 text-sm ${
              texte.length === 0 || texteValide
                ? "text-gray-500"
                : "text-red-600"
            }`}
          >
            {texte.length} caractères (entre {LIMITES.texteMin} et{" "}
            {LIMITES.texteMax})
          </p>
        </div>

        <button
          type="submit"
          disabled={!formulaireValide || chargement}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {chargement ? "Génération en cours…" : "Générer la fiche"}
        </button>
      </form>

      {erreur && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {erreur}
        </p>
      )}

      {fiche && (
        <>
          <p className="mt-6 rounded border border-green-300 bg-green-50 p-3 text-green-800">
            Fiche enregistrée.{" "}
            <Link
              href={`/fiches/${fiche.id}`}
              className="font-medium underline"
            >
              Retrouver cette fiche
            </Link>
          </p>
          <AffichageFiche fiche={fiche} />
        </>
      )}
    </div>
  );
}
