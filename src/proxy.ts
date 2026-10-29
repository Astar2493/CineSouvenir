import { NextResponse, type NextRequest } from "next/server";
import { mettreAJourSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Si l'adresse de retour du lien de connexion n'est pas autorisée dans Supabase,
  // celui-ci renvoie vers la Site URL (souvent l'accueil) avec le code :
  // on le transmet à la route qui ouvre la session
  const { pathname, searchParams } = request.nextUrl;
  if (searchParams.has("code") && !pathname.startsWith("/auth/") && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  return mettreAJourSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};