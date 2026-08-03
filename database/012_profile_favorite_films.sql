-- filmes/séries favoritos do perfil (até 4 — exibidos no perfil público)
create table public.profile_favorite_films (
  id          bigserial   primary key,
  user_id     bigint      not null references public.profiles (id) on delete cascade,
  tmdb_id     integer     not null,
  media_type  varchar(5)  not null check (media_type in ('movie', 'tv')),
  position    smallint    not null check (position between 1 and 4),
  created_at  timestamptz not null default now(),

  unique (user_id, position),
  unique (user_id, tmdb_id, media_type)
);

create index idx_profile_fav_films_user on public.profile_favorite_films (user_id);

alter table public.profile_favorite_films enable row level security;

create policy "filmes favoritos visíveis para todos"
  on public.profile_favorite_films for select using (true);

create policy "usuário gerencia seus filmes favoritos"
  on public.profile_favorite_films for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));
