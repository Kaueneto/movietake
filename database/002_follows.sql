-- Seguidores entre usuários
create table public.follows (
  follower_id   bigint      not null references public.profiles (id) on delete cascade,
  following_id  bigint      not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (follower_id, following_id),
  -- impede auto-follow
  constraint no_self_follow check (follower_id <> following_id)
);

create index idx_follows_following on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follows visíveis para todos"
  on public.follows for select using (true);

create policy "usuário gerencia seus próprios follows"
  on public.follows for insert
  with check (
    follower_id = (select id from public.profiles where auth_id = auth.uid())
  );

create policy "usuário remove seus próprios follows"
  on public.follows for delete
  using (
    follower_id = (select id from public.profiles where auth_id = auth.uid())
  );
