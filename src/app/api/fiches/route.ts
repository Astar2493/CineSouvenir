import { LIMITES } from "@/lib/fiche";
import { limiteurGenerations } from "@/lib/limitation";
import { extraireTextePdf } from "@/lib/pdf";
import { publierGeneration } from "@/lib/qstash";
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
      { erreur: "Votre session a expiré. Reconnectez-vous pour générer une fiche." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const titre = typeof body.titre === "string" ? body.titre.trim() : "";

  if (!titre || titre.length > LIMITES.titreMax) {
    return Response.json(
      { erreur: `Le titre est obligatoire (${LIMITES.titreMax} caractères maximum).` },
      { status: 400 }
    );
  }

  // 1. Récupération du texte : saisi directement ou extrait d'un PDF
  let texte: string;
  let cheminFichier: string | null = null;

  if (typeof body.cheminFichier === "string") {
    const chemin: string = body.cheminFichier;

    if (!chemin.startsWith(`${user.id}/`) || !chemin.endsWith(".pdf")) {
      return Response.json({ erreur: "Fichier invalide." }, { status: 400 });
    }

    cheminFichier = chemin;

    try {
      texte = await extraireTextePdf(supabase, chemin);
    } catch (erreur) {
      console.error("Erreur lors de la lecture du PDF :", erreur);
      return Response.json(
        { erreur: "Impossible de lire ce PDF. Vérifiez qu'il n'est pas endommagé." },
        { status: 422 }
      );
    }
  } else {
    texte = typeof body.texte === "string" ? body.texte.trim() : "";
  }

  if (texte.length < LIMITES.texteMin || texte.length > LIMITES.texteMax) {
    const origine = cheminFichier ? "Le texte extrait du PDF" : "Le texte";
    const conseil =
      cheminFichier && texte.length < LIMITES.texteMin
        ? " S'il s'agit d'un document scanné, il ne contient pas de texte lisible."
        : "";

    return Response.json(
      {
        erreur: `${origine} doit contenir entre ${LIMITES.texteMin} et ${LIMITES.texteMax} caractères (actuellement ${texte.length}).${conseil}`,
      },
      { status: 400 }
    );
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
          erreur: `Vous avez atteint votre quota de ${quota.limit} fiches par heure. Réessayez dans ${minutes} minute(s).`,
        },
        { status: 429, headers: { ...enTetesQuota, "Retry-After": String(secondes) } }
      );
    }
  } catch (erreur) {
    console.error("Limitation de débit indisponible :", erreur);
  }

  // 3. Enregistrement de la demande, avec le statut « en attente »
  const { data: fiche, error } = await supabase
    .from("fiches")
    .insert({ titre, texte_source: texte, fichier_chemin: cheminFichier })
    .select("id, statut")
    .single();

  if (error || !fiche) {
    console.error("Erreur lors de l'enregistrement de la demande :", error);
    return Response.json(
      { erreur: "La demande n'a pas pu être enregistrée. Réessayez plus tard." },
      { status: 500 }
    );
  }

  // 4. Publication du message de génération dans la file
  try {
    await publierGeneration(fiche.id);
  } catch (erreur) {
    console.error("Erreur lors de la publication du message :", erreur);

    // Traitement système, sans utilisateur : usage légitime du client administrateur
    await creerClientAdmin()
      .from("fiches")
      .update({ statut: "erreur", message_erreur: "La génération n'a pas pu être lancée." })
      .eq("id", fiche.id);

    return Response.json(
      { erreur: "La génération n'a pas pu être lancée. Réessayez plus tard." },
      { status: 503 }
    );
  }

  // 5. Réponse immédiate : la demande est acceptée, le traitement suivra
  return Response.json(fiche, { status: 202, headers: enTetesQuota });
}