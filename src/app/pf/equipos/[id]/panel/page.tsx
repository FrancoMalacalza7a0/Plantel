"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RX_QUEJA =
  /dolor|duele|doli[oó]|molest|lesi[oó]n|tir[oó]n|pinch|desgarr|inflam/i;

type Semaforo = "verde" | "amarillo" | "rojo" | "gris";

const COLOR_DOT: Record<Semaforo, string> = {
  verde: "bg-grass",
  amarillo: "bg-rpe-mid",
  rojo: "bg-rpe-max",
  gris: "bg-ink/20",
};

const COLOR_LABEL: Record<Semaforo, string> = {
  verde: "Funciona bien",
  amarillo: "A seguir de cerca",
  rojo: "Necesita atención",
  gris: "Pocos datos todavía",
};

function pct(num: number, den: number): number {
  return den > 0 ? (num / den) * 100 : 0;
}

function calcularSemaforo(
  adherenciaPct: number,
  quejasPct: number,
  desvioPct: number | null,
  muestras: number
): { color: Semaforo; score: number } {
  if (muestras < 3) return { color: "gris", score: 0 };
  let score = adherenciaPct - quejasPct * 1.5;
  if (desvioPct !== null) score -= Math.min(desvioPct, 50) * 0.6;
  score = Math.max(0, Math.min(100, score));
  const color: Semaforo = score >= 80 ? "verde" : score >= 55 ? "amarillo" : "rojo";
  return { color, score };
}

interface WellnessRow {
  jugador_id: string;
  fecha: string;
  sueno: number | null;
  fatiga: number | null;
  dolor_muscular: number | null;
  estres: number | null;
  animo: number | null;
}

function promedioWellness(rows: WellnessRow[]): number | null {
  const valores: number[] = [];
  rows.forEach((r) => {
    [r.sueno, r.fatiga, r.dolor_muscular, r.estres, r.animo].forEach((v) => {
      if (v != null) valores.push(v);
    });
  });
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function semaforoWellness(prom: number | null): Semaforo {
  if (prom === null) return "gris";
  if (prom <= 2.2) return "verde";
  if (prom <= 3.4) return "amarillo";
  return "rojo";
}

interface EquipoMin {
  id: string;
  nombre: string;
}

interface SesionRow {
  id: string;
  fecha: string;
  titulo: string;
}

interface SesEjRow {
  id: string;
  sesion_id: string;
  ejercicio_id: string;
  rpe_esperado: number | null;
  ejercicios: { nombre: string } | null;
}

interface RespuestaRow {
  sesion_ejercicio_id: string;
  completado: boolean;
  comentario: string | null;
}

interface FeedbackRow {
  sesion_id: string;
  rpe: number;
  comentario: string | null;
}

interface Miembro {
  jugador_id: string;
  profiles: { nombre: string } | null;
}

export default function PanelPage() {
  const params = useParams<{ id: string }>();
  const equipoId = params.id;

  const [equipo, setEquipo] = useState<EquipoMin | null>(null);
  const [sesiones, setSesiones] = useState<SesionRow[]>([]);
  const [sesEj, setSesEj] = useState<SesEjRow[]>([]);
  const [respuestas, setRespuestas] = useState<RespuestaRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [wellness, setWellness] = useState<WellnessRow[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const [eqRes, sesRes, miRes] = await Promise.all([
      supabase.from("equipos").select("id, nombre").eq("id", equipoId).single(),
      supabase
        .from("sesiones")
        .select("id, fecha, titulo")
        .eq("equipo_id", equipoId)
        .order("fecha", { ascending: false })
        .limit(60),
      supabase
        .from("miembros_equipo")
        .select("jugador_id, profiles(nombre)")
        .eq("equipo_id", equipoId)
        .eq("activo", true),
    ]);
    setEquipo(eqRes.data);
    const sesionesData = sesRes.data ?? [];
    setSesiones(sesionesData);
    const miembrosData = (miRes.data as unknown as Miembro[]) ?? [];
    setMiembros(miembrosData);

    const sesionIds = sesionesData.map((s) => s.id);
    const jugadorIds = miembrosData.map((m) => m.jugador_id);

    const [sesEjRes, fbRes, wellRes] = await Promise.all([
      sesionIds.length
        ? supabase
            .from("sesion_ejercicios")
            .select("id, sesion_id, ejercicio_id, rpe_esperado, ejercicios(nombre)")
            .in("sesion_id", sesionIds)
        : Promise.resolve({ data: [] }),
      sesionIds.length
        ? supabase
            .from("feedback_sesion")
            .select("sesion_id, rpe, comentario")
            .in("sesion_id", sesionIds)
        : Promise.resolve({ data: [] }),
      jugadorIds.length
        ? supabase
            .from("wellness")
            .select("jugador_id, fecha, sueno, fatiga, dolor_muscular, estres, animo")
            .in("jugador_id", jugadorIds)
            .order("fecha", { ascending: false })
            .limit(jugadorIds.length * 14)
        : Promise.resolve({ data: [] }),
    ]);
    const sesEjData = (sesEjRes.data as unknown as SesEjRow[]) ?? [];
    setSesEj(sesEjData);
    setFeedbacks((fbRes.data as unknown as FeedbackRow[]) ?? []);
    setWellness((wellRes.data as unknown as WellnessRow[]) ?? []);

    const seIds = sesEjData.map((se) => se.id);
    const respRes = seIds.length
      ? await supabase
          .from("respuestas_ejercicio")
          .select("sesion_ejercicio_id, completado, comentario")
          .in("sesion_ejercicio_id", seIds)
      : { data: [] };
    setRespuestas((respRes.data as RespuestaRow[]) ?? []);

    setCargando(false);
  }, [equipoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="text-ink/50">Cargando…</p>;
  if (!equipo) return <p className="text-ink/50">No encontramos el equipo.</p>;

  const statsEjercicioMap = new Map<
    string,
    { nombre: string; total: number; hechos: number; quejas: number; usos: Set<string> }
  >();
  sesEj.forEach((se) => {
    const nombre = se.ejercicios?.nombre ?? "Ejercicio";
    const actual =
      statsEjercicioMap.get(se.ejercicio_id) ??
      { nombre, total: 0, hechos: 0, quejas: 0, usos: new Set<string>() };
    const resp = respuestas.filter((r) => r.sesion_ejercicio_id === se.id);
    actual.total += resp.length;
    actual.hechos += resp.filter((r) => r.completado).length;
    actual.quejas += resp.filter(
      (r) => r.comentario && RX_QUEJA.test(r.comentario)
    ).length;
    actual.usos.add(se.sesion_id);
    statsEjercicioMap.set(se.ejercicio_id, actual);
  });

  const ejerciciosStats = Array.from(statsEjercicioMap.entries())
    .map(([id, s]) => {
      const adherenciaPct = pct(s.hechos, s.total);
      const quejasPct = pct(s.quejas, s.total);
      const { color, score } = calcularSemaforo(adherenciaPct, quejasPct, null, s.total);
      return {
        id,
        nombre: s.nombre,
        adherenciaPct,
        quejas: s.quejas,
        usos: s.usos.size,
        color,
        score,
      };
    })
    .sort((a, b) => a.score - b.score);

  const sesEjPorSesion = new Map<string, SesEjRow[]>();
  sesEj.forEach((se) => {
    const arr = sesEjPorSesion.get(se.sesion_id) ?? [];
    arr.push(se);
    sesEjPorSesion.set(se.sesion_id, arr);
  });

  const sesionesStats = sesiones
    .map((s) => {
      const ejerciciosDeSesion = sesEjPorSesion.get(s.id) ?? [];
      const seIdsSesion = new Set(ejerciciosDeSesion.map((se) => se.id));
      const resp = respuestas.filter((r) => seIdsSesion.has(r.sesion_ejercicio_id));
      const totalResp = resp.length;
      const hechos = resp.filter((r) => r.completado).length;
      const quejasEj = resp.filter(
        (r) => r.comentario && RX_QUEJA.test(r.comentario)
      ).length;

      const fb = feedbacks.filter((f) => f.sesion_id === s.id);
      const quejasFb = fb.filter(
        (f) => f.comentario && RX_QUEJA.test(f.comentario)
      ).length;
      const quejas = quejasEj + quejasFb;

      const esperados = ejerciciosDeSesion
        .map((se) => se.rpe_esperado)
        .filter((v): v is number => v != null);
      const promEsperado = esperados.length
        ? esperados.reduce((a, b) => a + b, 0) / esperados.length
        : null;
      const promReal = fb.length
        ? fb.reduce((a, b) => a + Number(b.rpe), 0) / fb.length
        : null;
      const desvioPct =
        promEsperado && promReal != null && promEsperado > 0
          ? (Math.abs(promReal - promEsperado) / promEsperado) * 100
          : null;

      const muestras = totalResp + fb.length;
      const adherenciaPct = pct(hechos, totalResp);
      const quejasPct = pct(quejas, muestras);
      const { color, score } = calcularSemaforo(adherenciaPct, quejasPct, desvioPct, muestras);

      return {
        id: s.id,
        titulo: s.titulo,
        fecha: s.fecha,
        adherenciaPct,
        quejas,
        promEsperado,
        promReal,
        muestras,
        color,
        score,
      };
    })
    .sort((a, b) => a.score - b.score);

  const wellnessPorJugador = new Map<string, WellnessRow[]>();
  wellness.forEach((w) => {
    const arr = wellnessPorJugador.get(w.jugador_id) ?? [];
    arr.push(w);
    wellnessPorJugador.set(w.jugador_id, arr);
  });

  const ordenColor: Record<Semaforo, number> = { rojo: 0, amarillo: 1, gris: 2, verde: 3 };
  const wellnessStats = miembros
    .map((m) => {
      const rows = wellnessPorJugador.get(m.jugador_id) ?? [];
      const recientes = rows.slice(0, 6);
      const prom = promedioWellness(recientes);
      return {
        jugadorId: m.jugador_id,
        nombre: m.profiles?.nombre ?? "Jugador",
        color: semaforoWellness(prom),
        ultima: rows[0]?.fecha ?? null,
      };
    })
    .sort((a, b) => ordenColor[a.color] - ordenColor[b.color]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/pf/equipos/${equipoId}`}
          className="text-sm text-ink/50 hover:text-ink"
        >
          ← Volver al equipo
        </Link>
        <h1 className="font-display font-black text-2xl mt-1">
          Panel de {equipo.nombre}
        </h1>
        <p className="text-sm text-ink/60 mt-1">
          Semáforo automático a partir de lo que cargan tus jugadores:
          asistencia por ejercicio, quejas de dolor o molestia en los
          comentarios, y qué tan lejos salió el RPE real del esperado. Es una
          guía, no un diagnóstico.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg">Wellness del plantel</h2>
        {wellnessStats.length === 0 ? (
          <p className="text-sm text-ink/60">Todavía no hay jugadores en el equipo.</p>
        ) : (
          <div className="card divide-y divide-ink/5">
            {wellnessStats.map((w) => (
              <div
                key={w.jugadorId}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[w.color]}`}
                    aria-hidden
                  />
                  <p className="font-medium truncate">{w.nombre}</p>
                </div>
                <p className="text-xs text-ink/50 shrink-0">
                  {w.ultima ? `Último check-in: ${w.ultima}` : "Sin check-ins"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg">Sesiones — qué funcionó</h2>
        {sesionesStats.length === 0 ? (
          <p className="text-sm text-ink/60">Todavía no hay sesiones.</p>
        ) : (
          <div className="space-y-2">
            {sesionesStats.map((s) => (
              <Link
                key={s.id}
                href={`/pf/equipos/${equipoId}/sesiones/${s.id}`}
                className="card block hover:border-grass transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[s.color]}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.titulo}</p>
                      <p className="text-xs text-ink/50">{s.fecha}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {s.muestras < 3 ? (
                      <p className="text-xs text-ink/40">Pocos datos</p>
                    ) : (
                      <>
                        <p className="text-xs text-ink/50">
                          {Math.round(s.adherenciaPct)}% hecho
                          {s.quejas > 0 &&
                            ` · ${s.quejas} queja${s.quejas > 1 ? "s" : ""}`}
                        </p>
                        {s.promEsperado != null && s.promReal != null && (
                          <p className="text-xs text-ink/40">
                            RPE esp. {s.promEsperado.toFixed(1)} · real{" "}
                            {s.promReal.toFixed(1)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg">
          Ejercicios — qué sirve y qué no
        </h2>
        {ejerciciosStats.length === 0 ? (
          <p className="text-sm text-ink/60">
            Todavía no usaste ejercicios en ninguna sesión de este equipo.
          </p>
        ) : (
          <div className="space-y-2">
            {ejerciciosStats.map((e) => (
              <div key={e.id} className="card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[e.color]}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{e.nombre}</p>
                    <p className="text-xs text-ink/50">
                      Usado {e.usos} {e.usos === 1 ? "vez" : "veces"} ·{" "}
                      {COLOR_LABEL[e.color]}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-ink/50">
                    {Math.round(e.adherenciaPct)}% hecho
                  </p>
                  {e.quejas > 0 && (
                    <p className="text-xs text-rpe-max">
                      {e.quejas} queja{e.quejas > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
