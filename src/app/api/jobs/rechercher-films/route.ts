import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ErreurIA, messageErreurIA } from "@/lib/ia";
import { NOMBRE_REESSAIS } from "@/lib/qstash";
import { rechercherFilms } from "@/lib/rechercher-films";
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
  const { rechercheId } = await request.json();
  const tentative = Number(request.headers.get("Upstash-Retried") ?? "0");

  // Le worker n'a pas d'utilisateur connecté : il utilise le client administrateur
  const supabase = creerClientAdmin();

  const { data: recherche } = await supabase
    .from("recherches")
    .select("id, souvenir, genre, epoque, details, animation, statut")
    .eq("id", rechercheId)
    .maybeSingle();

  // Idempotence : une recherche absente ou déjà traitée n'est pas relancée
  if (!recherche || recherche.statut !== "en_attente") {
    return Response.json({ resultat: "ignoré" });
  }

  try {
    const films = await rechercherFilms(recherche);

    // Les films sont enregistrés avant le changement de statut, pour que le formulaire
    // les trouve dès qu'il est notifié ; l'upsert évite les doublons en cas de nouvelle tentative
    const { error: erreurFilms } = await supabase.from("films_proposes").upsert(
      films.map((film, index) => ({ recherche_id: recherche.id, rang: index + 1, ...film })),
      { onConflict: "recherche_id,rang" }
    );

    if (erreurFilms) {
      throw new Error(`Enregistrement des films impossible : ${erreurFilms.message}`);
    }

    await supabase
      .from("recherches")
      .update({ statut: "prete", modele: process.env.AI_MODEL })
      .eq("id", recherche.id);

    return Response.json({ resultat: "prête" });
  } catch (erreur) {
    console.error(`Échec de la recherche (tentative ${tentative + 1}) :`, erreur);

    // Erreur passagère et tentatives restantes : on demande à QStash de réessayer
    if (estReessayable(erreur) && tentative < NOMBRE_REESSAIS) {
      return Response.json({ resultat: "nouvelle tentative" }, { status: 500 });
    }

    // Erreur définitive ou dernière tentative : on enregistre l'échec
    await supabase
      .from("recherches")
      .update({ statut: "erreur", message_erreur: messageErreurIA(erreur) })
      .eq("id", recherche.id);

    return Response.json({ resultat: "erreur" });
  }
}

// La vérification de signature est créée à la requête et non au chargement du module :
// elle exige les clés QStash, qui ne sont pas toujours disponibles pendant le build
export async function POST(request: Request) {
  return verifySignatureAppRouter(traiter)(request);
}
