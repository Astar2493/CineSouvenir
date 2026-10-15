import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AffichageFiche from "@/components/AffichageFiche";
import type { FicheEnregistree } from "@/lib/fiche";
import { creerClientServeur } from "@/lib/supabase/server";

export default function DetailFiche({ params }: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl p-8">Chargement…</main>}>
      <ContenuDetailFiche params={params} />
    </Suspense>
  );
}

async function ContenuDetailFiche({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await creerClientServeur();
  const { data: fiche } = await supabase
    .from("fiches")
    .select("id, titre, synthese, questions, created_at, fichier_chemin, statut, message_erreur")
    .eq("id", id)
    .maybeSingle<FicheEnregistree>();

  if (!fiche) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/fiches" className="text-blue-600 underline">
        ← Retour à mes fiches
      </Link>
      <p className="mt-4 text-sm text-gray-500">
        Créée le {new Date(fiche.created_at).toLocaleDateString("fr-FR")}
      </p>
      {fiche.statut === "prete" && <AffichageFiche fiche={fiche} />}

      {fiche.statut === "en_attente" && (
        <p className="mt-6 rounded border border-yellow-300 bg-yellow-50 p-3 text-yellow-800">
          La fiche « {fiche.titre} » est en cours de génération. Rechargez la page dans
          quelques instants.
        </p>
      )}

      {fiche.statut === "erreur" && (
        <p className="mt-6 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          La génération de la fiche « {fiche.titre} » a échoué :{" "}
          {fiche.message_erreur ?? "erreur inconnue"}.
        </p>
      )}
    </main>
  );
}
