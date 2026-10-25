import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CircleAlert, Clock } from "lucide-react";
import ListeFilms from "@/components/ListeFilms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EPOQUES, GENRES, libelle } from "@/lib/recherche";
import { lireRecherche } from "@/lib/recherche-serveur";
import { creerClientServeur } from "@/lib/supabase/server";

export default function DetailRecherche({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button variant="ghost" nativeButton={false} render={<Link href="/recherches" />}>
        <ArrowLeft data-icon="inline-start" />
        Mes recherches
      </Button>
      <Suspense fallback={<Skeleton className="mt-6 h-40 w-full rounded-xl" />}>
        <ContenuDetailRecherche params={params} />
      </Suspense>
    </main>
  );
}

async function ContenuDetailRecherche({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await creerClientServeur();
  const recherche = await lireRecherche(supabase, id);

  if (!recherche) {
    notFound();
  }

  const indices = [
    libelle(GENRES, recherche.genre),
    libelle(EPOQUES, recherche.epoque),
    recherche.animation ? "Animation" : null,
  ].filter((indice) => indice !== null);

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Votre souvenir</CardTitle>
          <CardDescription>
            Recherche du {new Date(recherche.created_at).toLocaleDateString("fr-FR")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-line">{recherche.souvenir}</p>
          {recherche.details && (
            <p className="text-sm text-muted-foreground">Détails : {recherche.details}</p>
          )}
          {indices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {indices.map((indice) => (
                <Badge key={indice} variant="secondary">
                  {indice}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recherche.statut === "prete" && <ListeFilms films={recherche.films} />}

      {recherche.statut === "en_attente" && (
        <Alert>
          <Clock />
          <AlertTitle>Recherche en cours</AlertTitle>
          <AlertDescription>Rechargez la page dans quelques instants.</AlertDescription>
        </Alert>
      )}

      {recherche.statut === "erreur" && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>La recherche a échoué</AlertTitle>
          <AlertDescription>{recherche.message_erreur ?? "Erreur inconnue."}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
