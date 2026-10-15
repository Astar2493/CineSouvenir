import type { Fiche } from "@/lib/fiche";

export default function AffichageFiche({ fiche }: { fiche: Fiche }) {
  return (
    <article className="mt-6 rounded-lg border p-6">
      <h2 className="text-2xl font-bold">{fiche.titre}</h2>

      <section className="mt-4">
        <h3 className="text-lg font-semibold">Synthèse</h3>
        <p className="mt-2 whitespace-pre-line text-gray-800">{fiche.synthese}</p>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Questions de révision</h3>
        <ol className="mt-2 flex flex-col gap-3">
          {fiche.questions.map((q, index) => (
            <li key={index} className="rounded border p-3">
              <p className="font-medium">
                {index + 1}. {q.question}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-blue-600">
                  Afficher la réponse
                </summary>
                <p className="mt-2 text-gray-700">{q.reponse}</p>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}