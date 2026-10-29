"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2, Search } from "lucide-react";
import ListeFilms from "@/components/ListeFilms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  EPOQUES,
  GENRES,
  LIMITES_RECHERCHE,
  NOMBRE_FILMS,
  type RechercheEnregistree,
} from "@/lib/recherche";
import { creerClientNavigateur } from "@/lib/supabase/client";

const DELAI_MAX_MS = 90000;
const INTERVALLE_VERIFICATION_MS = 4000;

async function lireRecherche(id: string): Promise<RechercheEnregistree | null> {
  const reponse = await fetch(`/api/recherches/${id}`, { cache: "no-store" });
  return reponse.ok ? reponse.json() : null;
}

// Attend que la recherche soit prête ou en erreur : notification Realtime en priorité,
// et vérification régulière en secours si la notification n'arrive pas
async function attendreRecherche(id: string): Promise<RechercheEnregistree> {
  const supabase = creerClientNavigateur();

  // L'abonnement doit être fait au nom de l'utilisateur,
  // pour que la Row Level Security autorise la réception des événements
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) await supabase.realtime.setAuth(session.access_token);

  return new Promise((resolve, reject) => {
    const canal = supabase.channel(`recherche-${id}`);
    let termine = false;

    function terminer(action: () => void) {
      if (termine) return;
      termine = true;
      clearTimeout(minuteur);
      clearInterval(verification);
      supabase.removeChannel(canal);
      action();
    }

    function examiner(recherche: RechercheEnregistree | null) {
      if (recherche?.statut === "prete") {
        terminer(() => resolve(recherche));
      } else if (recherche?.statut === "erreur") {
        terminer(() =>
          reject(new Error(recherche.message_erreur ?? "La recherche a échoué."))
        );
      }
    }

    const minuteur = setTimeout(
      () =>
        terminer(() =>
          reject(
            new Error(
              "La recherche prend plus de temps que prévu. Ses résultats apparaîtront dans « Mes recherches » dès qu'ils seront prêts."
            )
          )
        ),
      DELAI_MAX_MS
    );

    const verification = setInterval(
      async () => examiner(await lireRecherche(id).catch(() => null)),
      INTERVALLE_VERIFICATION_MS
    );

    canal
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "recherches", filter: `id=eq.${id}` },
        async (evenement) => {
          const statut = (evenement.new as { statut?: string }).statut;
          if (statut === "prete" || statut === "erreur") examiner(await lireRecherche(id));
        }
      )
      .subscribe(async (statut) => {
        if (statut === "SUBSCRIBED") {
          // La recherche a pu se terminer avant l'abonnement : on vérifie une fois l'état actuel
          examiner(await lireRecherche(id));
        }

        // Sans temps réel, la vérification régulière prend le relais
        if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
          console.warn(`Connexion en temps réel indisponible (${statut})`);
        }
      });
  });
}

export default function FormulaireRecherche() {
  const [souvenir, setSouvenir] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [epoque, setEpoque] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [animation, setAnimation] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [etape, setEtape] = useState("");
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState<RechercheEnregistree | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);

  const souvenirValide =
    souvenir.trim().length >= LIMITES_RECHERCHE.souvenirMin &&
    souvenir.length <= LIMITES_RECHERCHE.souvenirMax;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setRecherche(null);

    try {
      setEtape("Envoi de la demande…");

      // Le jeton d'accès accompagne la demande, en secours des cookies de session
      const {
        data: { session },
      } = await creerClientNavigateur().auth.getSession();

      const reponse = await fetch("/api/recherches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ souvenir, genre, epoque, details, animation }),
      });
      const donnees = await reponse.json();

      const entete = reponse.headers.get("X-RateLimit-Remaining");
      if (entete !== null) setRestantes(Number(entete));

      if (!reponse.ok) {
        setErreur(donnees.erreur ?? "Une erreur est survenue.");
        return;
      }

      setEtape("Recherche en cours…");
      setRecherche(await attendreRecherche(donnees.id));
    } catch (err) {
      setErreur(
        err instanceof TypeError
          ? "Impossible de contacter le serveur."
          : (err as Error).message
      );
    } finally {
      setChargement(false);
      setEtape("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Vos souvenirs</CardTitle>
          <CardDescription>
            Racontez ce dont vous vous souvenez, même vaguement : l&apos;IA vous proposera les
            {` ${NOMBRE_FILMS} `}films qui y ressemblent le plus.
          </CardDescription>
        </CardHeader>

        <form onSubmit={envoyer}>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="souvenir">Ce dont vous vous souvenez</Label>
              <Textarea
                id="souvenir"
                value={souvenir}
                onChange={(e) => setSouvenir(e.target.value)}
                placeholder="Exemple : un homme se réveille chaque matin le même jour, dans une petite ville enneigée…"
                className="min-h-44"
                aria-invalid={souvenir.length > 0 && !souvenirValide}
              />
              <p
                className={`text-sm ${
                  souvenir.length === 0 || souvenirValide
                    ? "text-muted-foreground"
                    : "text-destructive"
                }`}
              >
                {souvenir.length} caractères (entre {LIMITES_RECHERCHE.souvenirMin} et{" "}
                {LIMITES_RECHERCHE.souvenirMax})
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="genre">Genre (facultatif)</Label>
                <Select items={GENRES} value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre" className="w-full">
                    <SelectValue placeholder="Je ne sais pas" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="epoque">Époque (facultatif)</Label>
                <Select items={EPOQUES} value={epoque} onValueChange={setEpoque}>
                  <SelectTrigger id="epoque" className="w-full">
                    <SelectValue placeholder="Je ne sais pas" />
                  </SelectTrigger>
                  <SelectContent>
                    {EPOQUES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="details">Acteurs ou détails (facultatif)</Label>
              <Input
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={LIMITES_RECHERCHE.detailsMax}
                placeholder="Exemple : Bill Murray, une marmotte, une scène dans un café…"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="animation">Film d&apos;animation</Label>
                <p className="text-sm text-muted-foreground">
                  Activez si le film était un dessin animé ou un film en images de synthèse.
                </p>
              </div>
              <Switch id="animation" checked={animation} onCheckedChange={setAnimation} />
            </div>
          </CardContent>

          <CardFooter className="mt-6 flex-col items-stretch gap-3">
            <Button type="submit" size="lg" disabled={!souvenirValide || chargement}>
              {chargement ? (
                <>
                  <Loader2 className="animate-spin" />
                  {etape}
                </>
              ) : (
                <>
                  <Search />
                  Retrouver le film
                </>
              )}
            </Button>

            {restantes !== null && (
              <p className="text-center text-sm text-muted-foreground">
                {restantes > 0
                  ? `Il vous reste ${restantes} recherche(s) pour l'heure en cours.`
                  : "Vous avez utilisé tout votre quota pour l'heure en cours."}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>

      {erreur && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>La recherche n&apos;a pas abouti</AlertTitle>
          <AlertDescription>{erreur}</AlertDescription>
        </Alert>
      )}

      {chargement && etape === "Recherche en cours…" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Vous pouvez quitter cette page : les résultats apparaîtront dans « Mes
            recherches » dès qu&apos;ils seront prêts.
          </p>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {recherche && (
        <>
          <ListeFilms films={recherche.films} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/recherches/${recherche.id}`} />}
          >
            Retrouver cette recherche plus tard
          </Button>
        </>
      )}
    </div>
  );
}
