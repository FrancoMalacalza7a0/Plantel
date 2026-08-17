-- ============================================================
-- MIGRACIÓN: fotos de referencia en ejercicios (hasta 3)
-- Pegar completo en: Supabase > SQL Editor > Run
-- Es segura de correr aunque hayas corrido una versión anterior.
-- ============================================================

-- 1) Columna de fotos (array de URLs)
alter table public.ejercicios add column if not exists imagenes_url text[];

-- Si existe la columna vieja de una sola imagen, pasar el dato y borrarla
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ejercicios'
      and column_name = 'imagen_url'
  ) then
    update public.ejercicios
      set imagenes_url = array[imagen_url]
      where imagen_url is not null and imagenes_url is null;
    alter table public.ejercicios drop column imagen_url;
  end if;
end $$;

-- 2) Bucket de Storage para las fotos (lectura pública por URL)
insert into storage.buckets (id, name, public)
values ('ejercicios', 'ejercicios', true)
on conflict (id) do nothing;

-- 3) Políticas (se recrean por si ya existían)
drop policy if exists "lectura publica de imagenes de ejercicios" on storage.objects;
create policy "lectura publica de imagenes de ejercicios"
  on storage.objects for select
  using (bucket_id = 'ejercicios');

drop policy if exists "pf sube imagenes de ejercicios" on storage.objects;
create policy "pf sube imagenes de ejercicios"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'pf'
    )
  );

drop policy if exists "pf borra sus imagenes de ejercicios" on storage.objects;
create policy "pf borra sus imagenes de ejercicios"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ejercicios' and owner = auth.uid());
