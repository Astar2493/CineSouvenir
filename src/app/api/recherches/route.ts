import { limiteurGenerations } from "@/lib/limitation";
import { publierRecherche } from "@/lib/qstash";
import { validerDemande } from "@/lib/recherche";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // 0. Vérification de la session
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { erreur: "Votre session a expiré. Reconnectez-vous pour lancer une recherche." },
      { status: 401 }
    );
  }

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
