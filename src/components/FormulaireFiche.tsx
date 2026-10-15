"use client";

import { useState } from "react";
import Link from "next/link";
import AffichageFiche from "@/components/AffichageFiche";
import { LIMITES, type FicheEnregistree } from "@/lib/fiche";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Mode = "texte" | "pdf";

const TAILLE_MAX_PDF = 5 * 1024 * 1024;
const DELAI_MAX_MS = 90000;

async function deposerPdf(fichier: File): Promise<string> {
  const supabase = creerClientNavigateur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Votre session a expiré. Reconnectez-vous.");
  }

  const chemin = `${user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from("cours")
    .upload(chemin, fichier, { contentType: "application/pdf" });

  if (error) {
    console.error(error);
    throw new Error("L'envoi du fichier a échoué. Vérifiez qu'il s'agit d'un PDF de 5 Mo maximum.");
  }

  return chemin;
}

// S'abonne aux changements de la fiche et attend qu'elle soit prête ou en erreur
async function attendreFiche(id: string): Promise<FicheEnregistree> {
  const supabase = creerClientNavigateur();

  // Charge la session : l'abonnement doit être fait au nom de l'utilisateur,
  // pour que la Row Level Security autorise la réception des événements
  await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const canal = supabase.channel(`fiche-${id}`);
    let termine = false;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    function terminer(action: () => void) {
      if (termine) return;
      termine = true;
      clearTimeout(minuteur);
      supabase.removeChannel(canal);
      action();
    }

    function examiner(fiche: FicheEnregistree) {
      if (fiche.statut === "prete") {
        terminer(() => resolve(fiche));
      } else if (fiche.statut === "erreur") {
        terminer(() =>
          reject(new Error(fiche.message_erreur ?? "La génération de la fiche a échoué."))
        );
      }
    }

    minuteur = setTimeout(
      () =>
        terminer(() =>
          reject(
            new Error(
              "La génération prend plus de temps que prévu. Votre fiche apparaîtra dans « Mes fiches » dès qu'elle sera prête."
            )
          )
        ),
      DELAI_MAX_MS
    );

    canal
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "fiches", filter: `id=eq.${id}` },
        (evenement) => examiner(evenement.new as FicheEnregistree)
      )
      .subscribe(async (statut) => {
        if (statut === "SUBSCRIBED") {
          // La génération a pu se terminer avant l'abonnement : on vérifie une fois l'état actuel
          const reponse = await fetch(`/api/fiches/${id}`, { cache: "no-store" });
          if (reponse.ok) examiner(await reponse.json());
        }

        if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
          terminer(() =>
            reject(
              new Error(
                "La connexion en temps réel a échoué. Votre fiche apparaîtra dans « Mes fiches » dès qu'elle sera prête."
              )
            )
          );
        }
      });
  });
}

export default function FormulaireFiche() {
  const [mode, setMode] = useState<Mode>("texte");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [cleFichier, setCleFichier] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [etape, setEtape] = useState("");
  const [erreur, setErreur] = useState("");
  const [fiche, setFiche] = useState<FicheEnregistree | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);

  const texteValide =
    texte.length >= LIMITES.texteMin && texte.length <= LIMITES.texteMax;
  const fichierValide =
    fichier !== null &&
    fichier.type === "application/pdf" &&
    fichier.size <= TAILLE_MAX_PDF;
  const contenuValide = mode === "texte" ? texteValide : fichierValide;
  const formulaireValide = titre.trim() !== "" && contenuValide;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setFiche(null);

    try {
      let corps: { titre: string; texte?: string; cheminFichier?: string };

      if (mode === "pdf" && fichier) {
        setEtape("Envoi du fichier…");
        const cheminFichier = await deposerPdf(fichier);
        corps = { titre, cheminFichier };
      } else {
        corps = { titre, texte };
      }

      setEtape("Enregistrement de la demande…");
      const reponse = await fetch("/api/fiches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json();

      const entete = reponse.headers.get("X-RateLimit-Remaining");
      if (entete !== null) setRestantes(Number(entete));

      if (!reponse.ok) {
        setErreur(donnees.erreur ?? "Une erreur est survenue.");
        return;
      }

      // La demande est acceptée : on vide le formulaire et on attend la fiche
      setTitre("");
      setTexte("");
      setFichier(null);
      setCleFichier((cle) => cle + 1);

      setEtape("Génération en arrière-plan…");
      const ficheTerminee = await attendreFiche(donnees.id);
      setFiche(ficheTerminee);
    } catch (err) {
      setErreur(
        err instanceof TypeError
          ? "Impossible de contacter le serveur."
          : (err as Error).message
      );
    } finally {
      setChargement(false);
      setEtape("");
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("texte")}
            className={`rounded px-3 py-1 text-sm ${
              mode === "texte" ? "bg-blue-600 text-white" : "border"
            }`}
          >
            Coller un texte
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`rounded px-3 py-1 text-sm ${
              mode === "pdf" ? "bg-blue-600 text-white" : "border"
            }`}
          >
            Envoyer un PDF
          </button>
        </div>

        {mode === "texte" ? (
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
                texte.length === 0 || texteValide ? "text-gray-500" : "text-red-600"
              }`}
            >
              {texte.length} caractères (entre {LIMITES.texteMin} et{" "}
              {LIMITES.texteMax})
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="fichier" className="block font-medium">
              Fichier PDF du cours
            </label>
            <input
              key={cleFichier}
              id="fichier"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
            <p
              className={`mt-1 text-sm ${
                fichier === null || fichierValide ? "text-gray-500" : "text-red-600"
              }`}
            >
              {fichier
                ? `${fichier.name} (${(fichier.size / 1024 / 1024).toFixed(1)} Mo)`
                : "PDF de 5 Mo maximum, contenant du texte sélectionnable"}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!formulaireValide || chargement}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {chargement ? etape : "Générer la fiche"}
        </button>

        {chargement && etape === "Génération en arrière-plan…" && (
          <p className="text-sm text-gray-500">
            Vous pouvez quitter cette page : la fiche apparaîtra dans « Mes fiches » dès
            qu'elle sera prête.
          </p>
        )}

        {restantes !== null && (
          <p className="text-sm text-gray-500">
            {restantes > 0
              ? `Il vous reste ${restantes} génération(s) pour l'heure en cours.`
              : "Vous avez utilisé tout votre quota pour l'heure en cours."}
          </p>
        )}
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
            <Link href={`/fiches/${fiche.id}`} className="font-medium underline">
              Retrouver cette fiche
            </Link>
          </p>
          <AffichageFiche fiche={fiche} />
        </>
      )}
    </div>
  );
}