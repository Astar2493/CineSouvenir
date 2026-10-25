import Link from "next/link";
import { connection } from "next/server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { creerClientServeur } from "@/lib/supabase/server";

export default async function EnTete() {
  await connection();
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4 text-sm">
        <Link href="/" className="font-semibold">
          CinéSouvenir
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/recherche" className="hover:underline">
            Nouvelle recherche
          </Link>
          <Link href="/recherches" className="hover:underline">
            Mes recherches
          </Link>
          <span className="text-gray-600">{user.email}</span>
          <BoutonDeconnexion />
        </div>
      </div>
    </header>
  );
}
