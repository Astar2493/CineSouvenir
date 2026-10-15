let compteur = 0;

export async function GET() {
  compteur++;

  return Response.json({
    message: "Bonjour depuis le serveur",
    date: new Date().toISOString(),
    appelsSurCetteInstance: compteur,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.texte || typeof body.texte !== "string") {
    return Response.json(
      { erreur: "Le champ 'texte' est obligatoire." },
      { status: 400 }
    );
  }

  return Response.json({
    texteRecu: body.texte,
    nombreDeCaracteres: body.texte.length,
  });
}