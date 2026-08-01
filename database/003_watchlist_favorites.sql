-- want assistir
create table public.watchlist (
  id          bigserial   primary key,
  user_id     bigint      not null references public.profiles (id) on delete cascade,
  tmdb_id     integer     not null,
  media_type  varchar(5)  not null check (media_type in ('movie', 'tv')),
  created_at  timestamptz not null default now(),

  unique (user_id, tmdb_id, media_type)
);

create index idx_watchlist_user on public.watchlist (user_id);

alter table public.watchlist enable row level security;

create policy "usuário vê e gerencia sua watchlist"
  on public.watchlist for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- favoritos
create table public.favorites (
  id          bigserial   primary key,
  user_id     bigint      not null references public.profiles (id) on delete cascade,
  tmdb_id     integer     not null,
  media_type  varchar(5)  not null check (media_type in ('movie', 'tv')),
  created_at  timestamptz not null default now(),

  unique (user_id, tmdb_id, media_type)
);

create index idx_favorites_user on public.favorites (user_id);

alter table public.favorites enable row level security;

create policy "usuário vê e gerencia seus favoritos"
  on public.favorites for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));
