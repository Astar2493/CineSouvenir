import type { Metadata } from "next";
import FormulaireRecherche from "@/components/FormulaireRecherche";

export const metadata: Metadata = {
  title: "Retrouver un film · CinéSouvenir",
};

export default function PageRecherche() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Retrouver un film</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Vous avez oublié le titre d&apos;un film ? Décrivez ce dont vous vous souvenez, l&apos;IA
        vous propose les 5 films les plus proches.
      </p>
      <FormulaireRecherche />
    </main>
  );
}
