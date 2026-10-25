import "server-only";
import type { RechercheEnregistree } from "@/lib/recherche";
import { creerClientServeur } from "@/lib/supabase/server";

type ClientSupabase = Awaited<ReturnType<typeof creerClientServeur>>;

// La Row Level Security limite la lecture aux recherches de l'utilisateur connecté
export async function lireRecherche(
  supabase: ClientSupabase,
  id: string
): Promise<RechercheEnregistree | null> {
  const { data } = await supabase
    .from("recherches")
    .select(
      "id, souvenir, genre, epoque, details, animation, statut, message_erreur, created_at, films_proposes (rang, titre, annee, resume, confiance)"
    )
    .eq("id", id)
    .order("rang", { referencedTable: "films_proposes", ascending: true })
    .maybeSingle();

  if (!data) return null;

  const { films_proposes, ...recherche } = data;

  return {
    ...recherche,
    films: (films_proposes ?? []).map(({ titre, annee, resume, confiance }) => ({
      titre,
      annee,
      resume,
      confiance,
    })),
  };
}

export async function listerRecherches(supabase: ClientSupabase) {
  return supabase
    .from("recherches")
    .select("id, souvenir, created_at, statut")
    .order("created_at", { ascending: false });
}
