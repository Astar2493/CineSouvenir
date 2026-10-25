import Link from "next/link";
import { ArrowRight, Film, MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ETAPES = [
  {
    icone: MessageSquareText,
    titre: "Racontez vos souvenirs",
    description:
      "Une scène, un personnage, une ambiance : décrivez ce qui vous reste du film, même flou.",
  },
  {
    icone: SlidersHorizontal,
    titre: "Ajoutez des indices",
    description: "Genre, époque, acteur ou film d'animation : chaque détail affine la recherche.",
  },
  {
    icone: Search,
    titre: "Recevez 5 propositions",
    description: "L'IA vous propose les 5 films les plus proches, avec un score de confiance.",
  },
];

const EXEMPLE = [
  { titre: "Un jour sans fin", annee: 1993, confiance: 92 },
  { titre: "Edge of Tomorrow", annee: 2014, confiance: 48 },
  { titre: "Happy Birthdead", annee: 2017, confiance: 35 },
];

export default function Accueil() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-28">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Film className="size-7" />
        </div>
        <Badge variant="outline" className="mb-4">
          Propulsé par l&apos;IA
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Retrouvez le film qui vous échappe
        </h1>
        <p className="mt-4 max-w-xl text-lg text-balance text-muted-foreground">
          Vous vous souvenez de l&apos;histoire mais plus du titre ? Décrivez ce qui vous a
          marqué : CinéSouvenir vous propose les 5 films qui correspondent le mieux.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href="/recherche" />}>
            Retrouver un film
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/recherches" />}
          >
            Mes recherches
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Connexion par e-mail, sans mot de passe.
        </p>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Comment ça marche</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {ETAPES.map(({ icone: Icone, titre, description }) => (
            <Card key={titre}>
              <CardHeader>
                <Icone className="mb-2 size-5 text-muted-foreground" />
                <CardTitle>{titre}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 pb-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Un exemple</h2>
        <Card className="mt-8">
          <CardHeader>
            <CardDescription>Votre souvenir</CardDescription>
            <CardTitle className="font-normal italic">
              « Un présentateur météo grincheux revit sans cesse la même journée dans une petite
              ville enneigée… »
            </CardTitle>
          </CardHeader>
        </Card>
        <ol className="mt-3 flex flex-col gap-3">
          {EXEMPLE.map((film, index) => (
            <li key={film.titre}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {film.titre}{" "}
                    <span className="font-normal text-muted-foreground">({film.annee})</span>
                  </CardTitle>
                  <CardAction>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {film.confiance} %
                    </Badge>
                  </CardAction>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
