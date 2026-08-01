-- listas de filmes/séries
create table public.lists (
  id           bigserial    primary key,
  owner_id     bigint       not null references public.profiles (id) on delete cascade,
  name         varchar(100) not null,
  description  text,
  -- public | followers | private
  visibility   varchar(15)  not null default 'public' check (visibility in ('public','followers','private')),
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index idx_lists_owner on public.lists (owner_id);

create trigger trg_lists_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

alter table public.lists enable row level security;

create policy "listas públicas visíveis para todos"
  on public.lists for select
  using (
    visibility = 'public'
    or owner_id = (select id from public.profiles where auth_id = auth.uid())
  );

create policy "dono gerencia a lista"
  on public.lists for all
  using (owner_id = (select id from public.profiles where auth_id = auth.uid()));


-- memberrs de uma lista compartilhada
create table public.list_members (
  id               bigserial    primary key,
  list_id          bigint       not null references public.lists (id) on delete cascade,
  user_id          bigint       not null references public.profiles (id) on delete cascade,
  -- owner | collaborator
  role             varchar(15)  not null default 'collaborator' check (role in ('owner','collaborator')),
  can_add_items    boolean      not null default true,
  can_remove_items boolean      not null default false,
  can_draw         boolean      not null default false,
  can_invite_members boolean    not null default false,
  invited_by       bigint       references public.profiles (id) on delete set null,
  joined_at        timestamptz  not null default now(),

  unique (list_id, user_id)
);

alter table public.list_members enable row level security;

create policy "membros visíveis ao dono e aos próprios membros"
  on public.list_members for select
  using (
    list_id in (select id from public.lists where owner_id = (select id from public.profiles where auth_id = auth.uid()))
    or user_id = (select id from public.profiles where auth_id = auth.uid())
  );


-- itens de uma lista
create table public.list_items (
  id          bigserial    primary key,
  list_id     bigint       not null references public.lists (id) on delete cascade,
  tmdb_id     integer      not null,
  media_type  varchar(5)   not null check (media_type in ('movie','tv')),
  added_by    bigint       not null references public.profiles (id) on delete cascade,
  notes       text,
  sort_order  integer,
  created_at  timestamptz  not null default now(),

  unique (list_id, tmdb_id, media_type)
);

create index idx_list_items_list on public.list_items (list_id);

alter table public.list_items enable row level security;

create policy "itens visíveis conforme visibilidade da lista"
  on public.list_items for select
  using (
    list_id in (select id from public.lists where visibility = 'public')
    or list_id in (select id from public.lists where owner_id = (select id from public.profiles where auth_id = auth.uid()))
  );

create policy "membro com permissão adiciona itens"
  on public.list_items for insert
  with check (
    list_id in (
      select list_id from public.list_members
      where user_id = (select id from public.profiles where auth_id = auth.uid())
        and can_add_items = true
    )
    or list_id in (select id from public.lists where owner_id = (select id from public.profiles where auth_id = auth.uid()))
  );


-- convites para listas
create table public.list_invites (
  id               bigserial    primary key,
  list_id          bigint       not null references public.lists (id) on delete cascade,
  invited_by       bigint       not null references public.profiles (id) on delete cascade,
  invited_user_id  bigint       not null references public.profiles (id) on delete cascade,
  invite_token     varchar(100) not null unique default gen_random_uuid()::text,
  -- pending | accepted | declined
  status           varchar(10)  not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at       timestamptz  not null default now(),
  responded_at     timestamptz
);

alter table public.list_invites enable row level security;

create policy "convite visível ao convidado e ao dono da lista"
  on public.list_invites for select
  using (
    invited_user_id = (select id from public.profiles where auth_id = auth.uid())
    or invited_by    = (select id from public.profiles where auth_id = auth.uid())
  );
