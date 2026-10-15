import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import TableauStatut from "@/components/TableauStatut";
import { estAdministrateur } from "@/lib/admin";
import { creerClientServeur } from "@/lib/supabase/server";

export default function Admin() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-8">Chargement…</main>}>
      <AdminProtege />
    </Suspense>
  );
}

async function AdminProtege() {
  await connection();

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!estAdministrateur(user?.email)) {
    notFound();
  }

  return <TableauStatut />;
}
