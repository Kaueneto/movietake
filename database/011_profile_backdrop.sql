-- add  backdrop_url ao perfil do usuário
alter table public.profiles add column if not exists backdrop_url text;

-- Bucket de avatares e backdrops de perfil
-- Nome: profile-images, public: true
  insert into storage.buckets (id, name, public)
 values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- Política: qualquer usuário autenticado pode fazer upload na própria pasta
  create policy "usuario faz upload do proprio avatar"
    on storage.objects for insert
    with check (
      bucket_id = 'profile-images'
      and auth.role() = 'authenticated'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "usuario atualiza propria imagem"
  on storage.objects for update
    using (
      bucket_id = 'profile-images'
      and auth.uid()::text = (storage.foldername(name))[1]
  );

    create policy "imagens de perfil sao publicas"
      on storage.objects for select
      using (bucket_id = 'profile-images');
