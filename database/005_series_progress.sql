-- progresso geral de uma série
create table public.series_progress (
  id                    bigserial    primary key,
  user_id               bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id               integer      not null,
  last_episode_tmdb_id  integer,
  current_season        integer,
  current_episode       integer,
  -- watching | completed | paused | dropped | plan_to_watch
  status                varchar(20)  not null check (status in ('watching','completed','paused','dropped','plan_to_watch')),
  started_at            timestamptz,
  completed_at          timestamptz,
  updated_at            timestamptz  not null default now(),

  unique (user_id, tmdb_id)
);

create index idx_series_progress_user on public.series_progress (user_id);

create trigger trg_series_progress_updated_at
  before update on public.series_progress
  for each row execute function public.set_updated_at();

alter table public.series_progress enable row level security;

create policy "usuário gerencia seu progresso"
  on public.series_progress for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- histórico de episódios assistidos
create table public.series_episode_history (
  id               bigserial    primary key,
  user_id          bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id          integer      not null,
  season_number    integer      not null,
  episode_number   integer      not null,
  episode_tmdb_id  integer      not null,
  watched_at       timestamptz  not null default now(),

  unique (user_id, episode_tmdb_id)
);

create index idx_episode_history_user      on public.series_episode_history (user_id);
create index idx_episode_history_user_serie on public.series_episode_history (user_id, tmdb_id);

alter table public.series_episode_history enable row level security;

create policy "usuário gerencia histórico de episódios"
  on public.series_episode_history for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));
