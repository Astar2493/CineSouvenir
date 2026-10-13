import Link from "next/link";
import { creerClientSupabase } from "@/lib/supabase";

// export const dynamic = "force-dynamic";

export default async function ListeFiches() {
  const supabase = creerClientSupabase();
  const { data: fiches, error } = await supabase
    .from("fiches")
    .select("id, titre, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mes fiches</h1>
        <Link href="/" className="rounded bg-blue-600 px-4 py-2 text-white">
          Nouvelle fiche
        </Link>
      </div>

      {error && (
        <p className="mt-6 text-red-700">Impossible de charger les fiches.</p>
      )}

      {fiches && fiches.length === 0 && (
        <p className="mt-6 text-gray-600">Aucune fiche pour l'instant.</p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {fiches?.map((fiche) => (
          <li key={fiche.id}>
            <Link
              href={`/fiches/${fiche.id}`}
              className="block rounded border p-4 hover:bg-gray-50"
            >
              <p className="font-medium">{fiche.titre}</p>
              <p className="text-sm text-gray-500">
                {new Date(fiche.created_at).toLocaleDateString("fr-FR")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
