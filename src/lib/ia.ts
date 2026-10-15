type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type SchemaJSON = {
  nom: string;
  schema: Record<string, unknown>;
};

export class ErreurIA extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function appelerModele(
  messages: Message[],
  options: { schema?: SchemaJSON } = {}
): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new ErreurIA("La configuration du modèle d'IA est incomplète.", 500);
  }

  const reponse = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      ...(options.schema && {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: options.schema.nom,
            strict: true,
            schema: options.schema.schema,
          },
        },
      }),
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!reponse.ok) {
    const detail = await reponse.text();
    console.error(`Erreur du modèle d'IA (${reponse.status}) : ${detail}`);
    throw new ErreurIA("Le modèle d'IA a renvoyé une erreur.", reponse.status);
  }

  const donnees = await reponse.json();
  return donnees.choices[0].message.content;
}

export function messageErreurIA(erreur: unknown): string {
  if (erreur instanceof ErreurIA && erreur.status === 429) {
    return "Le service d'IA est momentanément saturé.";
  }

  if (erreur instanceof ErreurIA && erreur.status === 413) {
    return "Le texte est trop volumineux pour le service d'IA.";
  }

  if (erreur instanceof Error && erreur.name === "TimeoutError") {
    return "Le service d'IA a mis trop de temps à répondre.";
  }

  return "La génération de la fiche a échoué.";
}