export type Question = {
  question: string;
  reponse: string;
};

export type Fiche = {
  titre: string;
  synthese: string;
  questions: Question[];
};

export const LIMITES = {
  titreMax: 150,
  texteMin: 200,
  texteMax: 8000,
};
