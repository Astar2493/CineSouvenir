export type Question = {
  question: string;
  reponse: string;
};

export type Fiche = {
  titre: string;
  synthese: string;
  questions: Question[];
};

export type StatutFiche = "en_attente" | "prete" | "erreur";

export type FicheEnregistree = Fiche & {
  id: string;
  created_at: string;
  statut: StatutFiche;
  message_erreur: string | null;
};

export const LIMITES = {
  titreMax: 150,
  texteMin: 200,
  texteMax: 8000,
};