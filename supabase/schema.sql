-- Schéma de CinéSouvenir : à exécuter une fois dans l'éditeur SQL de Supabase
-- (Dashboard → SQL Editor → New query), sur un projet vide.
--
--   auth.users 1 ──── n recherches 1 ──── n films_proposes
--
-- Les utilisateurs connectés lisent et créent leurs propres recherches.
-- Le worker (clé secrète, qui contourne la Row Level Security) met à jour
-- le statut et enregistre les films proposés.

-- ---------------------------------------------------------------------------
-- 1. Recherches : ce dont l'utilisateur se souvient
-- ---------------------------------------------------------------------------
create table public.recherches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  souvenir       text not null check (char_length(souvenir) between 20 and 5000),
  genre          text check (genre in (
                   'action', 'aventure', 'comedie', 'documentaire', 'drame', 'fantastique',
                   'horreur', 'policier', 'romance', 'science-fiction', 'thriller', 'autre'
                 )),
  epoque         text check (epoque in (
                   'avant-1960', 'annees-60', 'annees-70', 'annees-80', 'annees-90',
                   'annees-2000', 'annees-2010', 'annees-2020'
                 )),
  details        text not null default '' check (char_length(details) <= 500),
  animation      boolean not null default false,
  statut         text not null default 'en_attente'
                 check (statut in ('en_attente', 'prete', 'erreur')),
  message_erreur text,
  modele         text,
  created_at     timestamptz not null default now()
);

create index recherches_user_id_created_at_idx
  on public.recherches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Films proposés : les 5 résultats de l'IA pour une recherche
-- ---------------------------------------------------------------------------
create table public.films_proposes (
  id           uuid primary key default gen_random_uuid(),
  recherche_id uuid not null references public.recherches (id) on delete cascade,
  rang         smallint not null check (rang between 1 and 5),
  titre        text not null check (char_length(titre) between 1 and 300),
  annee        smallint not null check (annee between 1870 and 2100),
  resume       text not null,
  confiance    smallint not null check (confiance between 0 and 100),
  created_at   timestamptz not null default now(),
  -- Un seul film par rang : permet au worker de réessayer sans créer de doublons
  unique (recherche_id, rang)
);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.recherches enable row level security;
alter table public.films_proposes enable row level security;

create policy "Lire ses recherches"
  on public.recherches for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Créer ses recherches"
  on public.recherches for insert
  to authenticated
  with check (user_id = (select auth.uid()) and statut = 'en_attente');

create policy "Supprimer ses recherches"
  on public.recherches for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Lire les films de ses recherches"
  on public.films_proposes for select
  to authenticated
  using (
    exists (
      select 1 from public.recherches r
      where r.id = films_proposes.recherche_id
        and r.user_id = (select auth.uid())
    )
  );

-- Aucune politique d'écriture sur films_proposes ni de mise à jour sur recherches :
-- seul le worker, avec la clé secrète, peut écrire les résultats.

-- ---------------------------------------------------------------------------
-- 4. Realtime : le formulaire attend le changement de statut de la recherche
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.recherches;
