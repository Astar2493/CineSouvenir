import "server-only";
import { redis } from "@/lib/limitation";
import { qstash } from "@/lib/qstash";
import type { Controle } from "@/lib/statut";
import { creerClientAdmin } from "@/lib/supabase/admin";

const controleVercel: Controle = {
  service: "Vercel",
  description: "Hébergement et fonctions serverless",
  verifier: async () => {
    const environnement = process.env.VERCEL_ENV ?? "local";
    const region = process.env.VERCEL_REGION ?? "poste du développeur";
    const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "aucun";
    return `Environnement : ${environnement} · Région : ${region} · Commit : ${commit}`;
  },
};

const controleIA: Controle = {
  service: "Modèle d'IA",
  description: "Recherche de films (API compatible OpenAI)",
  verifier: async () => {
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!baseUrl || !apiKey || !model) {
      throw new Error("Variables AI_BASE_URL, AI_API_KEY ou AI_MODEL manquantes");
    }

    const reponse = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!reponse.ok) {
      throw new Error(`L'API a répondu avec le statut ${reponse.status}`);
    }

    const donnees = await reponse.json();
    const modeleDisponible = donnees.data?.some(
      (m: { id: string }) => m.id === model
    );

    if (!modeleDisponible) {
      throw new Error(`Le modèle ${model} n'est pas disponible chez ce fournisseur`);
    }

    return `Modèle ${model} disponible sur ${new URL(baseUrl).host}`;
  },
};

const controleBase: Controle = {
  service: "Supabase Database",
  description: "Base de données des recherches",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const [recherches, films] = await Promise.all([
      supabase.from("recherches").select("id", { count: "exact", head: true }),
      supabase.from("films_proposes").select("id", { count: "exact", head: true }),
    ]);

    const erreur = recherches.error ?? films.error;
    if (erreur) {
      throw new Error(erreur.message);
    }

    return `${recherches.count ?? 0} recherche(s) · ${films.count ?? 0} film(s) proposé(s)`;
  },
};

const controleAuth: Controle = {
  service: "Supabase Auth",
  description: "Connexion des utilisateurs",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (error) {
      throw new Error(error.message);
    }

    return "Service d'authentification joignable";
  },
};

const controleRedis: Controle = {
  service: "Upstash Redis",
  description: "Limitation du nombre de recherches",
  verifier: async () => {
    const reponse = await redis.ping();

    if (reponse !== "PONG") {
      throw new Error(`Réponse inattendue : ${reponse}`);
    }

    const nombreCles = await redis.dbsize();
    return `Base joignable · ${nombreCles} clé(s) en mémoire`;
  },
};

const controleQStash: Controle = {
  service: "Upstash QStash",
  description: "File de messages des recherches",
  verifier: async () => {
    if (!process.env.QSTASH_URL || !process.env.QSTASH_TOKEN) {
      throw new Error("Variables QSTASH_URL ou QSTASH_TOKEN manquantes");
    }

    if (!process.env.APP_URL) {
      throw new Error("Variable APP_URL manquante : QStash ne saurait pas où livrer les messages");
    }

    if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
      throw new Error("Clés de signature manquantes : le worker refuserait tous les messages");
    }

    await qstash.schedules.list();

    return `Service joignable · Destination : ${process.env.APP_URL}`;
  },
};

const controleRealtime: Controle = {
  service: "Supabase Realtime",
  description: "Notifications en temps réel",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const canal = supabase.channel(`controle-${Date.now()}`);

    try {
      await new Promise<void>((resolve, reject) => {
        canal.subscribe((statut, erreur) => {
          if (statut === "SUBSCRIBED") resolve();
          if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
            reject(erreur ?? new Error(`Connexion impossible (${statut})`));
          }
        });
      });

      return "Connexion WebSocket établie";
    } finally {
      await supabase.removeChannel(canal);
      supabase.realtime.disconnect();
    }
  },
};

export const CONTROLES: Controle[] = [
  controleVercel,
  controleIA,
  controleBase,
  controleAuth,
  controleRedis,
  controleQStash,
  controleRealtime,
];
