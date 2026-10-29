import { cookies } from "next/headers";
import { limiteurGenerations } from "@/lib/limitation";
import { publierRecherche } from "@/lib/qstash";
import { validerDemande } from "@/lib/recherche";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientAvecJeton, creerClientServeur } from "@/lib/supabase/server";

// Session lue dans les cookies, ou à défaut dans l'en-tête Authorization envoyé par le formulaire
async function utilisateurConnecte(request: Request) {
  const supabase = await creerClientServeur();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    return { supabase, user };
  }

  const jeton = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (jeton) {
    const clientJeton = creerClientAvecJeton(jeton);
    const { data, error: erreurJeton } = await clientJeton.auth.getUser(jeton);

    if (data.user) {
      console.warn("Session absente des cookies : utilisation du jeton de l'en-tête Authorization");
      return { supabase: clientJeton, user: data.user };
    }

    console.error("Jeton de l'en-tête Authorization refusé :", erreurJeton?.message);
  }

  // Les noms des cookies (jamais leurs valeurs) aident à comprendre pourquoi la session manque
  const cookiesSupabase = (await cookies())
    .getAll()
    .map((cookie) => cookie.name)
    .filter((nom) => nom.startsWith("sb-"));
  console.error(
    "Session introuvable :",
    error?.message ?? "aucune erreur",
    "· cookies Supabase reçus :",
    cookiesSupabase.join(", ") || "aucun"
  );

  return null;
}

export async function POST(request: Request) {
  // 0. Vérification de la session
  const session = await utilisateurConnecte(request);

  if (!session) {
    return Response.json(
      { erreur: "Votre session a expiré. Reconnectez-vous pour lancer une recherche." },
      { status: 401 }
    );
  }

  const { supabase, user } = session;

  // 1. Validation de la demande
  const demande = validerDemande(await request.json().catch(() => null));

  if (typeof demande === "string") {
    return Response.json({ erreur: demande }, { status: 400 });
  }

  // 2. Vérification du quota de l'utilisateur
  const enTetesQuota: Record<string, string> = {};

  try {
    const quota = await limiteurGenerations.limit(user.id);

    enTetesQuota["X-RateLimit-Limit"] = String(quota.limit);
    enTetesQuota["X-RateLimit-Remaining"] = String(quota.remaining);

    if (!quota.success) {
      const secondes = Math.max(1, Math.ceil((quota.reset - Date.now()) / 1000));
      const minutes = Math.ceil(secondes / 60);

      return Response.json(
        {
          erreur: `Vous avez atteint votre quota de ${quota.limit} recherches par heure. Réessayez dans ${minutes} minute(s).`,
        },
        { status: 429, headers: { ...enTetesQuota, "Retry-After": String(secondes) } }
      );
    }
  } catch (erreur) {
    console.error("Limitation de débit indisponible :", erreur);
  }

  // 3. Enregistrement de la demande, avec le statut « en attente »
  const { data: recherche, error } = await supabase
    .from("recherches")
    .insert(demande)
    .select("id, statut")
    .single();

  if (error || !recherche) {
    console.error("Erreur lors de l'enregistrement de la recherche :", error);
    return Response.json(
      { erreur: "La recherche n'a pas pu être enregistrée. Réessayez plus tard." },
      { status: 500 }
    );
  }

  // 4. Publication du message de recherche dans la file
  try {
    await publierRecherche(recherche.id);
  } catch (erreur) {
    console.error("Erreur lors de la publication du message :", erreur);

    // Traitement système, sans utilisateur : usage légitime du client administrateur
    await creerClientAdmin()
      .from("recherches")
      .update({ statut: "erreur", message_erreur: "La recherche n'a pas pu être lancée." })
      .eq("id", recherche.id);

    return Response.json(
      { erreur: "La recherche n'a pas pu être lancée. Réessayez plus tard." },
      { status: 503 }
    );
  }

  // 5. Réponse immédiate : la demande est acceptée, le traitement suivra
  return Response.json(recherche, { status: 202, headers: enTetesQuota });
}
