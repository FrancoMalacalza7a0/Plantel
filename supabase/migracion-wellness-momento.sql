-- ============================================================
-- PLANTEL — Wellness dos veces por día (mañana / noche)
-- Pegar completo en: Supabase > SQL Editor > Run
-- Requiere que supabase/schema.sql ya esté aplicado.
-- ============================================================

alter table public.wellness
  add column if not exists momento text not null default 'manana'
    check (momento in ('manana', 'noche'));

alter table public.wellness
  drop constraint if exists wellness_jugador_id_fecha_key;

alter table public.wellness
  drop constraint if exists wellness_jugador_fecha_momento_key;

alter table public.wellness
  add constraint wellness_jugador_fecha_momento_key
    unique (jugador_id, fecha, momento);

drop index if exists idx_wellness_jugador_fecha;
create index idx_wellness_jugador_fecha
  on public.wellness (jugador_id, fecha desc, momento);
