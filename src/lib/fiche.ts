export type Question = {
  question: string;
  reponse: string;
};

export type Fiche = {
  titre: string;
  synthese: string;
  questions: Question[];
};

export type FicheEnregistree = Fiche & {
  id: string;
  created_at: string;
};

export const LIMITES = {
  titreMax: 150,
  texteMin: 200,
  texteMax: 8000,
};
