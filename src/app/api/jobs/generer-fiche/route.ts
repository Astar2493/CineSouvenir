import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { genererFiche } from "@/lib/generer-fiche";
import { ErreurIA, messageErreurIA } from "@/lib/ia";
import { NOMBRE_REESSAIS } from "@/lib/qstash";
import { creerClientAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

function estReessayable(erreur: unknown): boolean {
  if (erreur instanceof ErreurIA) {
    return erreur.status === 429 || erreur.status >= 500;
  }
  // Délai dépassé, panne réseau ou erreur inattendue : une nouvelle tentative peut réussir
  return true;
}

async function traiter(request: Request) {
  const { ficheId } = await request.json();
  const tentative = Number(request.headers.get("Upstash-Retried") ?? "0");

  // Le worker n'a pas d'utilisateur connecté : il utilise le client administrateur
  const supabase = creerClientAdmin();

  const { data: fiche } = await supabase
    .from("fiches")
    .select("id, titre, texte_source, statut")
    .eq("id", ficheId)
    .maybeSingle();

  // Idempotence : une fiche absente ou déjà traitée n'est pas générée une seconde fois
  if (!fiche || fiche.statut !== "en_attente") {
    return Response.json({ resultat: "ignoré" });
  }

  try {
    const resultat = await genererFiche(fiche.titre, fiche.texte_source);

    await supabase
      .from("fiches")
      .update({
        synthese: resultat.synthese,
        questions: resultat.questions,
        modele: process.env.AI_MODEL,
        statut: "prete",
      })
      .eq("id", fiche.id);

    return Response.json({ resultat: "prête" });
  } catch (erreur) {
    console.error(`Échec de la génération (tentative ${tentative + 1}) :`, erreur);

    // Erreur passagère et tentatives restantes : on demande à QStash de réessayer
    if (estReessayable(erreur) && tentative < NOMBRE_REESSAIS) {
      return Response.json({ resultat: "nouvelle tentative" }, { status: 500 });
    }

    // Erreur définitive ou dernière tentative : on enregistre l'échec
    await supabase
      .from("fiches")
      .update({ statut: "erreur", message_erreur: messageErreurIA(erreur) })
      .eq("id", fiche.id);

    return Response.json({ resultat: "erreur" });
  }
}

export const POST = verifySignatureAppRouter(traiter);