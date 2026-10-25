export const GENRES = [
  { value: "action", label: "Action" },
  { value: "aventure", label: "Aventure" },
  { value: "comedie", label: "Comédie" },
  { value: "documentaire", label: "Documentaire" },
  { value: "drame", label: "Drame" },
  { value: "fantastique", label: "Fantastique" },
  { value: "horreur", label: "Horreur" },
  { value: "policier", label: "Policier" },
  { value: "romance", label: "Romance" },
  { value: "science-fiction", label: "Science-fiction" },
  { value: "thriller", label: "Thriller" },
  { value: "autre", label: "Autre" },
];

export const EPOQUES = [
  { value: "avant-1960", label: "Avant 1960" },
  { value: "annees-60", label: "Années 60" },
  { value: "annees-70", label: "Années 70" },
  { value: "annees-80", label: "Années 80" },
  { value: "annees-90", label: "Années 90" },
  { value: "annees-2000", label: "Années 2000" },
  { value: "annees-2010", label: "Années 2010" },
  { value: "annees-2020", label: "Années 2020" },
];

export const NOMBRE_FILMS = 5;

export const LIMITES_RECHERCHE = {
  souvenirMin: 20,
  souvenirMax: 5000,
  detailsMax: 500,
  titreMax: 80,
};

export type StatutRecherche = "en_attente" | "prete" | "erreur";

export type DemandeRecherche = {
  souvenir: string;
  genre: string | null;
  epoque: string | null;
  details: string;
  animation: boolean;
};

export type FilmPropose = {
  titre: string;
  annee: number;
  resume: string;
  confiance: number;
};

export type RechercheEnregistree = DemandeRecherche & {
  id: string;
  created_at: string;
  statut: StatutRecherche;
  message_erreur: string | null;
  films: FilmPropose[];
};

export function libelle(liste: { value: string; label: string }[], valeur: string | null) {
  return liste.find((element) => element.value === valeur)?.label ?? null;
}

export function titreRecherche(souvenir: string): string {
  const texte = souvenir.replace(/\s+/g, " ").trim();
  return texte.length > LIMITES_RECHERCHE.titreMax
    ? `${texte.slice(0, LIMITES_RECHERCHE.titreMax - 1)}…`
    : texte;
}

// Valide le corps d'une requête et renvoie la demande, ou un message d'erreur
export function validerDemande(corps: unknown): DemandeRecherche | string {
  const c = (typeof corps === "object" && corps !== null ? corps : {}) as Record<string, unknown>;

  const souvenir = typeof c.souvenir === "string" ? c.souvenir.trim() : "";
  if (
    souvenir.length < LIMITES_RECHERCHE.souvenirMin ||
    souvenir.length > LIMITES_RECHERCHE.souvenirMax
  ) {
    return `Décrivez ce dont vous vous souvenez en ${LIMITES_RECHERCHE.souvenirMin} à ${LIMITES_RECHERCHE.souvenirMax} caractères.`;
  }

  const genre = typeof c.genre === "string" && libelle(GENRES, c.genre) ? c.genre : null;
  const epoque = typeof c.epoque === "string" && libelle(EPOQUES, c.epoque) ? c.epoque : null;

  const details = typeof c.details === "string" ? c.details.trim() : "";
  if (details.length > LIMITES_RECHERCHE.detailsMax) {
    return `Les détails ne doivent pas dépasser ${LIMITES_RECHERCHE.detailsMax} caractères.`;
  }

  return { souvenir, genre, epoque, details, animation: c.animation === true };
}
