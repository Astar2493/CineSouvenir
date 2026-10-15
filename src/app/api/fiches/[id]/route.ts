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

  const { data: fiche, error } = await supabase
    .from("fiches")
    .select("id, titre, synthese, questions, created_at, statut, message_erreur")
    .eq("id", id)
    .maybeSingle();

  if (error || !fiche) {
    return Response.json({ erreur: "Fiche introuvable." }, { status: 404 });
  }

  return Response.json(fiche);
}
