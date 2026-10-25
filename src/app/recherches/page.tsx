import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { titreRecherche } from "@/lib/recherche";
import { listerRecherches } from "@/lib/recherche-serveur";
import { creerClientServeur } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mes recherches · CinéSouvenir",
};

export default function ListeRecherches() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Mes recherches</h1>
        <Button nativeButton={false} render={<Link href="/recherche" />}>
          <Plus data-icon="inline-start" />
          Nouvelle recherche
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <ContenuListeRecherches />
      </Suspense>
    </main>
  );
}

async function ContenuListeRecherches() {
  await connection();
  const supabase = await creerClientServeur();
  const { data: recherches, error } = await listerRecherches(supabase);

  if (error) {
    return <p className="mt-6 text-destructive">Impossible de charger les recherches.</p>;
  }

  if (!recherches || recherches.length === 0) {
    return <p className="mt-6 text-muted-foreground">Aucune recherche pour l&apos;instant.</p>;
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {recherches.map((recherche) => (
        <li key={recherche.id}>
          <Link href={`/recherches/${recherche.id}`} className="block">
            <Card size="sm" className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="line-clamp-1">{titreRecherche(recherche.souvenir)}</CardTitle>
                <CardDescription>
                  {new Date(recherche.created_at).toLocaleDateString("fr-FR")}
                </CardDescription>
                {recherche.statut !== "prete" && (
                  <CardAction>
                    <Badge variant={recherche.statut === "erreur" ? "destructive" : "secondary"}>
                      {recherche.statut === "erreur" ? "Échec" : "En cours"}
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
