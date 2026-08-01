-- perfis de usuário — espelha auth.users do Supabase
create table public.profiles (
  id            bigserial     primary key,
  auth_id       uuid          not null unique references auth.users (id) on delete cascade,
  username      varchar(50)   not null unique,
  display_name  varchar(100)  not null,
  bio           varchar(500),
  avatar_url    text,
  is_private    boolean       not null default false,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

-- atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "perfil visível para todos"
  on public.profiles for select using (true);

create policy "usuário edita o próprio perfil"
  on public.profiles for update
  using (auth.uid() = auth_id);

-- cria perfil automaticamente ao registrar no auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (auth_id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
