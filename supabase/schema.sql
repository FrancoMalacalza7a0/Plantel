-- ============================================================
-- PLANTEL — Esquema de base de datos para Supabase (Postgres)
-- Pegar completo en: Supabase > SQL Editor > Run
-- ============================================================

-- ---------- TABLAS ----------

-- Perfil de cada usuario (se crea solo al registrarse, ver trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('pf', 'jugador')),
  created_at timestamptz not null default now()
);

-- Equipos / planteles. El código de invitación es lo que el PF
-- comparte con sus jugadores para que se unan.
create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  deporte text not null default 'futbol',
  codigo_invitacion text not null unique
    default upper(substr(md5(random()::text), 1, 6)),
  pf_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.miembros_equipo (
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  jugador_id uuid not null references public.profiles(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (equipo_id, jugador_id)
);

-- Biblioteca de ejercicios del PF (se reusa entre sus equipos)
create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  pf_id uuid not null references public.profiles(id) on delete cascade,
  nombre text not null,
  descripcion text,
  video_url text,
  imagenes_url text[],
  categoria text not null default 'otro'
    check (categoria in ('calentamiento', 'fuerza', 'campo', 'prevencion', 'otro')),
  created_at timestamptz not null default now()
);

create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  fecha date not null,
  titulo text not null,
  notas text,
  created_at timestamptz not null default now()
);

-- Ejercicios dentro de una sesión, con su prescripción.
-- Gimnasio: series/repeticiones/carga/pausa. Campo: duracion_min + rpe_esperado.
create table public.sesion_ejercicios (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios(id),
  bloque text not null default 'otro'
    check (bloque in ('calentamiento', 'fuerza', 'campo', 'prevencion', 'otro')),
  orden int not null default 0,
  series int,
  repeticiones text,
  carga text,
  pausa text,
  duracion_min int,
  rpe_esperado numeric(3,1),
  notas text
);

-- Respuesta del jugador POR EJERCICIO: lo hizo + comentario libre
create table public.respuestas_ejercicio (
  id uuid primary key default gen_random_uuid(),
  sesion_ejercicio_id uuid not null references public.sesion_ejercicios(id) on delete cascade,
  jugador_id uuid not null references public.profiles(id) on delete cascade,
  completado boolean not null default false,
  comentario text,
  created_at timestamptz not null default now(),
  unique (sesion_ejercicio_id, jugador_id)
);

-- Feedback del jugador POR SESIÓN: RPE (Borg CR-10) + minutos.
-- carga = sRPE de Foster (RPE x minutos), se calcula sola.
create table public.feedback_sesion (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  jugador_id uuid not null references public.profiles(id) on delete cascade,
  rpe numeric(3,1) not null check (rpe >= 0 and rpe <= 10),
  minutos int not null check (minutos > 0 and minutos <= 300),
  carga numeric generated always as (rpe * minutos) stored,
  comentario text,
  created_at timestamptz not null default now(),
  unique (sesion_id, jugador_id)
);

-- Wellness diario (índice de Hooper: escalas 1-5).
-- La UI llega en la próxima etapa, pero la tabla ya queda lista.
create table public.wellness (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  sueno int check (sueno between 1 and 5),
  fatiga int check (fatiga between 1 and 5),
  dolor_muscular int check (dolor_muscular between 1 and 5),
  estres int check (estres between 1 and 5),
  animo int check (animo between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (jugador_id, fecha)
);

-- ---------- TRIGGER: crear perfil al registrarse ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    case
      when new.raw_user_meta_data->>'rol' = 'pf' then 'pf'
      else 'jugador'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- FUNCIONES HELPER PARA RLS ----------
-- (security definer para evitar recursión entre políticas)

create or replace function public.es_pf_del_equipo(eq uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from equipos e where e.id = eq and e.pf_id = auth.uid()
  );
$$;

create or replace function public.es_miembro_del_equipo(eq uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from miembros_equipo m
    where m.equipo_id = eq and m.jugador_id = auth.uid() and m.activo
  );
$$;

-- ¿El usuario actual es PF de algún equipo donde juega este jugador?
create or replace function public.es_pf_de_jugador(j uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from miembros_equipo m
    join equipos e on e.id = m.equipo_id
    where m.jugador_id = j and e.pf_id = auth.uid()
  );
$$;

-- ¿El usuario actual (jugador) pertenece a algún equipo de este PF?
create or replace function public.juega_para_pf(pf uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from miembros_equipo m
    join equipos e on e.id = m.equipo_id
    where m.jugador_id = auth.uid() and m.activo and e.pf_id = pf
  );
$$;

create or replace function public.es_pf_de_sesion(s uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from sesiones se
    join equipos e on e.id = se.equipo_id
    where se.id = s and e.pf_id = auth.uid()
  );
$$;

create or replace function public.puede_ver_sesion(s uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from sesiones se
    where se.id = s
      and (public.es_pf_del_equipo(se.equipo_id)
           or public.es_miembro_del_equipo(se.equipo_id))
  );
$$;

create or replace function public.es_pf_de_se(se_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from sesion_ejercicios se
    join sesiones s on s.id = se.sesion_id
    join equipos e on e.id = s.equipo_id
    where se.id = se_id and e.pf_id = auth.uid()
  );
$$;

-- ---------- RPC: unirse a un equipo con el código ----------

create or replace function public.unirse_a_equipo(codigo_input text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  eq record;
  perfil record;
begin
  select * into perfil from profiles where id = auth.uid();
  if perfil is null then
    return json_build_object('ok', false, 'error', 'No hay sesión activa.');
  end if;
  if perfil.rol <> 'jugador' then
    return json_build_object('ok', false, 'error', 'Solo los jugadores pueden unirse con un código.');
  end if;

  select * into eq from equipos
  where codigo_invitacion = upper(trim(codigo_input));

  if eq is null then
    return json_build_object('ok', false, 'error', 'Código inválido. Revisá con tu PF.');
  end if;

  insert into miembros_equipo (equipo_id, jugador_id, activo)
  values (eq.id, auth.uid(), true)
  on conflict (equipo_id, jugador_id) do update set activo = true;

  return json_build_object('ok', true, 'equipo', eq.nombre);
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.equipos enable row level security;
alter table public.miembros_equipo enable row level security;
alter table public.ejercicios enable row level security;
alter table public.sesiones enable row level security;
alter table public.sesion_ejercicios enable row level security;
alter table public.respuestas_ejercicio enable row level security;
alter table public.feedback_sesion enable row level security;
alter table public.wellness enable row level security;

-- profiles
create policy "ver mi perfil, mis jugadores o mi pf" on public.profiles
  for select using (
    id = auth.uid()
    or public.es_pf_de_jugador(id)
    or public.juega_para_pf(id)
  );
create policy "editar mi perfil" on public.profiles
  for update using (id = auth.uid());

-- equipos
create policy "ver mis equipos" on public.equipos
  for select using (pf_id = auth.uid() or public.es_miembro_del_equipo(id));
create policy "pf crea equipos" on public.equipos
  for insert with check (pf_id = auth.uid());
create policy "pf edita sus equipos" on public.equipos
  for update using (pf_id = auth.uid());
create policy "pf borra sus equipos" on public.equipos
  for delete using (pf_id = auth.uid());

-- miembros_equipo
create policy "ver miembros" on public.miembros_equipo
  for select using (
    public.es_pf_del_equipo(equipo_id) or jugador_id = auth.uid()
  );
create policy "pf gestiona miembros" on public.miembros_equipo
  for insert with check (public.es_pf_del_equipo(equipo_id));
create policy "pf actualiza miembros" on public.miembros_equipo
  for update using (public.es_pf_del_equipo(equipo_id));
create policy "salir o echar" on public.miembros_equipo
  for delete using (
    public.es_pf_del_equipo(equipo_id) or jugador_id = auth.uid()
  );

-- ejercicios
create policy "ver ejercicios" on public.ejercicios
  for select using (pf_id = auth.uid() or public.juega_para_pf(pf_id));
create policy "pf crea ejercicios" on public.ejercicios
  for insert with check (pf_id = auth.uid());
create policy "pf edita ejercicios" on public.ejercicios
  for update using (pf_id = auth.uid());
create policy "pf borra ejercicios" on public.ejercicios
  for delete using (pf_id = auth.uid());

-- sesiones
create policy "ver sesiones" on public.sesiones
  for select using (
    public.es_pf_del_equipo(equipo_id) or public.es_miembro_del_equipo(equipo_id)
  );
create policy "pf crea sesiones" on public.sesiones
  for insert with check (public.es_pf_del_equipo(equipo_id));
create policy "pf edita sesiones" on public.sesiones
  for update using (public.es_pf_del_equipo(equipo_id));
create policy "pf borra sesiones" on public.sesiones
  for delete using (public.es_pf_del_equipo(equipo_id));

-- sesion_ejercicios
create policy "ver ejercicios de sesion" on public.sesion_ejercicios
  for select using (public.puede_ver_sesion(sesion_id));
create policy "pf arma la sesion" on public.sesion_ejercicios
  for insert with check (public.es_pf_de_sesion(sesion_id));
create policy "pf edita la sesion" on public.sesion_ejercicios
  for update using (public.es_pf_de_sesion(sesion_id));
create policy "pf quita ejercicios" on public.sesion_ejercicios
  for delete using (public.es_pf_de_sesion(sesion_id));

-- respuestas_ejercicio
create policy "ver respuestas" on public.respuestas_ejercicio
  for select using (jugador_id = auth.uid() or public.es_pf_de_se(sesion_ejercicio_id));
create policy "jugador responde" on public.respuestas_ejercicio
  for insert with check (jugador_id = auth.uid());
create policy "jugador corrige su respuesta" on public.respuestas_ejercicio
  for update using (jugador_id = auth.uid());

-- feedback_sesion
create policy "ver feedback" on public.feedback_sesion
  for select using (jugador_id = auth.uid() or public.es_pf_de_sesion(sesion_id));
create policy "jugador carga rpe" on public.feedback_sesion
  for insert with check (jugador_id = auth.uid());
create policy "jugador corrige rpe" on public.feedback_sesion
  for update using (jugador_id = auth.uid());

-- wellness
create policy "ver wellness" on public.wellness
  for select using (jugador_id = auth.uid() or public.es_pf_de_jugador(jugador_id));
create policy "jugador carga wellness" on public.wellness
  for insert with check (jugador_id = auth.uid());
create policy "jugador edita wellness" on public.wellness
  for update using (jugador_id = auth.uid());

-- ---------- ÍNDICES ----------
create index idx_sesiones_equipo_fecha on public.sesiones (equipo_id, fecha desc);
create index idx_se_sesion on public.sesion_ejercicios (sesion_id, orden);
create index idx_resp_jugador on public.respuestas_ejercicio (jugador_id);
create index idx_feedback_sesion on public.feedback_sesion (sesion_id);
create index idx_wellness_jugador_fecha on public.wellness (jugador_id, fecha desc);
create index idx_miembros_jugador on public.miembros_equipo (jugador_id);

-- ---------- STORAGE: imágenes de referencia de ejercicios ----------

insert into storage.buckets (id, name, public)
values ('ejercicios', 'ejercicios', true)
on conflict (id) do nothing;

create policy "lectura publica de imagenes de ejercicios"
  on storage.objects for select
  using (bucket_id = 'ejercicios');

create policy "pf sube imagenes de ejercicios"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'pf'
    )
  );

create policy "pf borra sus imagenes de ejercicios"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ejercicios' and owner = auth.uid());
