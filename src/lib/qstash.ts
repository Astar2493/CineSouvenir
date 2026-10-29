import "server-only";
import { Client } from "@upstash/qstash";

export const NOMBRE_REESSAIS = 3;

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN ?? "",
  // Une valeur vide est ignorée : la bibliothèque utilise alors l'adresse de QStash dans le cloud
  baseUrl: process.env.QSTASH_URL || undefined,
});

const ADRESSE_LOCALE = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;

// Adresse à laquelle QStash livre les messages : APP_URL, ou à défaut le domaine
// de production fourni par Vercel
export function adresseApplication(): string | undefined {
  const adresse =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);

  return adresse ? adresse.replace(/\/+$/, "") : undefined;
}

// Renvoie la liste des problèmes de configuration, vide si tout est correct
export function problemesConfigurationQStash(): string[] {
  const problemes: string[] = [];
  const appUrl = adresseApplication();

  if (!process.env.QSTASH_URL || !process.env.QSTASH_TOKEN) {
    problemes.push("Variables QSTASH_URL ou QSTASH_TOKEN manquantes");
  }

  if (!appUrl) {
    problemes.push("Variable APP_URL manquante : QStash ne saurait pas où livrer les messages");
  }

  // En ligne, une adresse locale est injoignable : QStash ne peut pas appeler le job,
  // et le serveur QStash de développement n'existe pas
  if (process.env.VERCEL) {
    if (appUrl && ADRESSE_LOCALE.test(appUrl)) {
      problemes.push(`APP_URL pointe vers ${appUrl} : indiquez l'adresse du site en ligne`);
    }
    if (process.env.QSTASH_URL && ADRESSE_LOCALE.test(process.env.QSTASH_URL)) {
      problemes.push(
        "QSTASH_URL pointe vers le serveur de développement local : utilisez les clés de console.upstash.com"
      );
    }
  }

  return problemes;
}

export async function publierRecherche(rechercheId: string) {
  const problemes = problemesConfigurationQStash();

  if (problemes.length > 0) {
    throw new Error(problemes.join(" · "));
  }

  const appUrl = adresseApplication();

  return qstash.publishJSON({
    url: `${appUrl}/api/jobs/rechercher-films`,
    body: { rechercheId },
    retries: NOMBRE_REESSAIS,
  });
}