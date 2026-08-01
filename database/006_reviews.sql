-- avaliações/reviews
create table public.reviews (
  id                bigserial    primary key,
  -- uma review é opcionalmente vinculada a uma entrada do histórico
  watch_history_id  bigint       unique references public.watch_history (id) on delete set null,
  user_id           bigint       not null references public.profiles (id) on delete cascade,
  tmdb_id           integer      not null,
  media_type        varchar(5)   not null check (media_type in ('movie', 'tv')),
  rating            smallint     check (rating between 1 and 5),
  review            text,
  contains_spoilers boolean      not null default false,
  -- sentimento: faliz | sad | chocador | triste | excited | in_love | tense | bored | angra
  emotion           varchar(30),
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create index idx_reviews_user       on public.reviews (user_id);
create index idx_reviews_tmdb       on public.reviews (tmdb_id, media_type);

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy "reviews públicas visíveis para todos"
  on public.reviews for select using (true);

create policy "usuário gerencia suas próprias reviews"
  on public.reviews for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- likes em reviews
create table public.review_likes (
  review_id   bigint      not null references public.reviews (id) on delete cascade,
  user_id     bigint      not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (review_id, user_id)
);

alter table public.review_likes enable row level security;

create policy "likes visíveis para todos"
  on public.review_likes for select using (true);

create policy "usuário gerencia seus likes"
  on public.review_likes for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- Comentários em reviews
create table public.review_comments (
  id          bigserial    primary key,
  review_id   bigint       not null references public.reviews (id) on delete cascade,
  user_id     bigint       not null references public.profiles (id) on delete cascade,
  comment     text         not null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create index idx_review_comments_review on public.review_comments (review_id);

create trigger trg_review_comments_updated_at
  before update on public.review_comments
  for each row execute function public.set_updated_at();

alter table public.review_comments enable row level security;

create policy "comentários visíveis para todos"
  on public.review_comments for select using (true);

create policy "usuário gerencia seus comentários"
  on public.review_comments for all
  using (user_id = (select id from public.profiles where auth_id = auth.uid()));


-- Companheiros de review (usuários que assistiram junto e também avaliaram)
create table public.review_companions (
  review_id   bigint  not null references public.reviews (id) on delete cascade,
  user_id     bigint  not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (review_id, user_id)
);

alter table public.review_companions enable row level security;

create policy "companheiros visíveis para todos"
  on public.review_companions for select using (true);
