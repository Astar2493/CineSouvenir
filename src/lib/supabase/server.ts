import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function creerClientServeur() {
  const magasinCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return magasinCookies.getAll();
        },
        setAll(cookiesAEcrire) {
          try {
            cookiesAEcrire.forEach(({ name, value, options }) =>
              magasinCookies.set(name, value, options)
            );
          } catch {
            // Appelé depuis un composant serveur, qui ne peut pas écrire de cookies.
            // Sans conséquence : le proxy se charge de rafraîchir la session.
          }
        },
      },
    }
  );
}

// Client authentifié par un jeton d'accès transmis dans l'en-tête Authorization,
// utilisé en secours quand les cookies de session ne parviennent pas au serveur
export function creerClientAvecJeton(jeton: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jeton}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
