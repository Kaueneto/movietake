-- Feed de atividades (para o feed social)
create table public.activities (
  id             bigserial    primary key,
  user_id        bigint       not null references public.profiles (id) on delete cascade,
  -- review | watched | series_completed | list_created | favorited | followed
  activity_type  varchar(30)  not null,
  reference_id   bigint,
  tmdb_id        integer,
  media_type     varchar(5)   check (media_type in ('movie','tv')),
  created_at     timestamptz  not null default now()
);

create index idx_activities_user       on public.activities (user_id);
create index idx_activities_created_at on public.activities (created_at desc);

alter table public.activities enable row level security;

create policy "atividades visíveis para seguidores e para o próprio usuário"
  on public.activities for select
  using (
    -- próprio usuário vê tudo
    user_id = (select id from public.profiles where auth_id = auth.uid())
    -- seguidores veem atividades de perfis públicos
    or user_id in (
      select p.id from public.profiles p
      where p.is_private = false
    )
    -- seguidores veem atividades de perfis privados que já seguem
    or user_id in (
      select following_id from public.follows
      where follower_id = (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- Insere atividade automaticamente ao registrar no watch_history
create or replace function public.record_watch_activity()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activities (user_id, activity_type, reference_id, tmdb_id, media_type)
  values (new.user_id, 'watched', new.id, new.tmdb_id, new.media_type);
  return new;
end;
$$;

create trigger trg_watch_history_activity
  after insert on public.watch_history
  for each row execute function public.record_watch_activity();

-- Insere atividade ao criar review
create or replace function public.record_review_activity()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activities (user_id, activity_type, reference_id, tmdb_id, media_type)
  values (new.user_id, 'review', new.id, new.tmdb_id, new.media_type);
  return new;
end;
$$;

create trigger trg_review_activity
  after insert on public.reviews
  for each row execute function public.record_review_activity();
