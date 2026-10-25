import { lireRecherche } from "@/lib/recherche-serveur";
import { creerClientServeur } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ erreur: "Authentification requise." }, { status: 401 });
  }

  const recherche = await lireRecherche(supabase, id);

  if (!recherche) {
    return Response.json({ erreur: "Recherche introuvable." }, { status: 404 });
  }

  return Response.json(recherche);
}
