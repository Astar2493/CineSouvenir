import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FilmPropose } from "@/lib/recherche";

function varianteConfiance(confiance: number) {
  if (confiance >= 70) return "default";
  if (confiance >= 40) return "secondary";
  return "outline";
}

export default function ListeFilms({ films }: { films: FilmPropose[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight">Films qui correspondent</h2>
      <ol className="flex flex-col gap-3">
        {films.map((film, index) => (
          <li key={`${film.titre}-${film.annee}`}>
            <Card size="sm">
              <CardHeader>
                <CardTitle>
                  {index + 1}. {film.titre}{" "}
                  <span className="font-normal text-muted-foreground">({film.annee})</span>
                </CardTitle>
                <CardAction>
                  <Badge variant={varianteConfiance(film.confiance)}>{film.confiance} %</Badge>
                </CardAction>
                <CardDescription>{film.resume}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
