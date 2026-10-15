import Link from "next/link";
import FormulaireFiche from "@/components/FormulaireFiche";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fiches de révision</h1>
        <Link href="/fiches" className="text-blue-600 underline">
          Mes fiches
        </Link>
      </div>
      <p className="mt-2 text-gray-600">
        Collez un cours, obtenez une fiche de synthèse et des questions de révision.
      </p>
      <FormulaireFiche />
    </main>
  );
}