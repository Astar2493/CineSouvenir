import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { creerClientServeur } from "@/lib/supabase/server";

type ClientSupabase = Awaited<ReturnType<typeof creerClientServeur>>;

export async function extraireTextePdf(
  supabase: ClientSupabase,
  chemin: string
): Promise<string> {
  const { data, error } = await supabase.storage.from("cours").download(chemin);

  if (error || !data) {
    throw new Error(`Téléchargement impossible : ${error?.message ?? "fichier introuvable"}`);
  }

  const pdf = await getDocumentProxy(new Uint8Array(await data.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}