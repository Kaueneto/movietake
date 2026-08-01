-- Preferências visuais do usuário por obra (poster/backdrop personalizados)
create table public.user_media_preferences (
  id                   bigserial    primary key,
  user_id              bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id              integer      not null,
  media_type           varchar(5)   not null check (media_type in ('movie','tv')),
  custom_poster_path   text,
  custom_backdrop_path text,
  created_at           timestamptz  not null default now(),

  unique (user_id, tmdb_id, media_type)
);

alter table public.user_media_preferences enable row level security;

create policy "preferências visíveis ao próprio usuário"
  on public.user_media_preferences for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));
