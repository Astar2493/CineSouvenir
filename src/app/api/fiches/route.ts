import { LIMITES } from "@/lib/fiche";
import { genererFiche } from "@/lib/generer-fiche";
import { ErreurIA } from "@/lib/ia";

export async function POST(request: Request) {
  const body = await request.json();
  const titre = typeof body.titre === "string" ? body.titre.trim() : "";
  const texte = typeof body.texte === "string" ? body.texte.trim() : "";

  if (!titre || titre.length > LIMITES.titreMax) {
    return Response.json(
      {
        erreur: `Le titre est obligatoire (${LIMITES.titreMax} caractères maximum).`,
      },
      { status: 400 },
    );
  }

  if (texte.length < LIMITES.texteMin || texte.length > LIMITES.texteMax) {
    return Response.json(
      {
        erreur: `Le texte doit contenir entre ${LIMITES.texteMin} et ${LIMITES.texteMax} caractères.`,
      },
      { status: 400 },
    );
  }

  try {
    const fiche = await genererFiche(titre, texte);
    return Response.json(fiche);
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}

function reponseErreur(erreur: unknown) {
  if (erreur instanceof ErreurIA && erreur.status === 429) {
    return Response.json(
      {
        erreur:
          "Le quota du service d'IA est atteint. Réessayez dans quelques instants.",
      },
      { status: 429 },
    );
  }

  if (erreur instanceof ErreurIA && erreur.status === 413) {
    return Response.json(
      {
        erreur:
          "Le texte est trop volumineux pour le service d'IA. Réduisez-le et réessayez.",
      },
      { status: 413 },
    );
  }

  if (erreur instanceof Error && erreur.name === "TimeoutError") {
    return Response.json(
      {
        erreur:
          "Le service d'IA met trop de temps à répondre. Réessayez plus tard.",
      },
      { status: 504 },
    );
  }

  console.error(erreur);
  return Response.json(
    { erreur: "La génération de la fiche a échoué. Réessayez plus tard." },
    { status: 502 },
  );
}
