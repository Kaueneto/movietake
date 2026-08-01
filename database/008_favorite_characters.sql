-- Personagens favoritos por filme/série
create table public.favorite_characters (
  id               bigserial    primary key,
  user_id          bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id          integer      not null,
  media_type       varchar(5)   not null check (media_type in ('movie','tv')),
  -- id do cast member no TMDB (person id)
  actor_tmdb_id    integer      not null,
  actor_name       varchar(200) not null,
  character_name   varchar(200),
  created_at       timestamptz  not null default now(),

  -- um favorito por obra por usuário
  unique (user_id, tmdb_id, media_type)
);

create index idx_fav_characters_user on public.favorite_characters (user_id);

alter table public.favorite_characters enable row level security;

create policy "personagens favoritos visíveis para todos"
  on public.favorite_characters for select using (true);

create policy "usuário gerencia seus personagens favoritos"
  on public.favorite_characters for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));
