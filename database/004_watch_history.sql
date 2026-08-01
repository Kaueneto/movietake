-- Histórico de visualizações
create table public.watch_history (
  id               bigserial    primary key,
  user_id          bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id          integer      not null,
  media_type       varchar(5)   not null check (media_type in ('movie', 'tv')),
  watched_at       timestamptz  not null default now(),
  rewatch          boolean      not null default false,
  -- com quem assistiu: alone | friends | family | partner | cinema | other
  watch_with       varchar(20)  check (watch_with in ('alone','friends','family','partner','cinema','other')),
  watch_with_note  varchar(200),
  created_at       timestamptz  not null default now()
);

create index idx_watch_history_user       on public.watch_history (user_id);
create index idx_watch_history_user_tmdb  on public.watch_history (user_id, tmdb_id, media_type);

alter table public.watch_history enable row level security;

create policy "usuário vê e gerencia seu histórico"
  on public.watch_history for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- companheiros de sessão (usuários cadastrados)
create table public.watch_history_companions (
  watch_history_id  bigint  not null references public.watch_history (id) on delete cascade,
  user_id           bigint  not null references public.profiles (id) on delete cascade,

  primary key (watch_history_id, user_id)
);

alter table public.watch_history_companions enable row level security;

create policy "companheiros visíveis ao dono da sessão"
  on public.watch_history_companions for select
  using (
    watch_history_id in (
      select id from public.watch_history
      where user_id = (select id from public.profiles where auth_id = auth.uid())
    )
  );

create policy "dono gerencia companheiros"
  on public.watch_history_companions for insert
  with check (
    watch_history_id in (
      select id from public.watch_history
      where user_id = (select id from public.profiles where auth_id = auth.uid())
    )
  );
