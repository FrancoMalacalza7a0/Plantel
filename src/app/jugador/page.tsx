"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RpePicker from "@/components/RpePicker";
import VideoEmbed from "@/components/VideoEmbed";
import FotosEjercicio from "@/components/FotosEjercicio";
import WellnessCheckIn from "@/components/WellnessCheckIn";
import { BLOQUES, type Bloque } from "@/lib/types";

const NOMBRE_BLOQUE = Object.fromEntries(
  BLOQUES.map((b) => [b.valor, b.label])
) as Record<Bloque, string>;

interface SesionHoy {
  id: string;
  titulo: string;
  notas: string | null;
  equipos: { nombre: string } | null;
}

interface SesionEj {
  id: string;
  bloque: Bloque;
  orden: number;
  series: number | null;
  repeticiones: string | null;
  carga: string | null;
  duracion_min: number | null;
  notas: string | null;
  ejercicios: { nombre: string; video_url: string | null; imagenes_url: string[] | null; descripcion: string | null } | null;
}

interface MiRespuesta {
  sesion_ejercicio_id: string;
  completado: boolean;
  comentario: string | null;
}

export default function JugadorHoy() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sesion, setSesion] = useState<SesionHoy | null>(null);
  const [ejercicios, setEjercicios] = useState<SesionEj[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, MiRespuesta>>({});
  const [videoAbierto, setVideoAbierto] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [rpe, setRpe] = useState<number | null>(null);
  const [minutos, setMinutos] = useState("");
  const [comentarioSesion, setComentarioSesion] = useState("");
  const [feedbackEnviado, setFeedbackEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardandoRpe, setGuardandoRpe] = useState(false);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const hoy = new Date().toISOString().slice(0, 10);
    const { data: sesiones } = await supabase
      .from("sesiones")
      .select("id, titulo, notas, equipos(nombre)")
      .eq("fecha", hoy)
      .order("created_at", { ascending: false })
      .limit(1);

    const s = (sesiones as unknown as SesionHoy[])?.[0] ?? null;
    setSesion(s);

    if (s) {
      const [ej, resp, fb] = await Promise.all([
        supabase
          .from("sesion_ejercicios")
          .select(
            "id, bloque, orden, series, repeticiones, carga, duracion_min, notas, ejercicios(nombre, video_url, imagenes_url, descripcion)"
          )
          .eq("sesion_id", s.id)
          .order("orden"),
        supabase
          .from("respuestas_ejercicio")
          .select("sesion_ejercicio_id, completado, comentario")
          .eq("jugador_id", user.id),
        supabase
          .from("feedback_sesion")
          .select("id")
          .eq("sesion_id", s.id)
          .eq("jugador_id", user.id)
          .maybeSingle(),
      ]);
      setEjercicios((ej.data as unknown as SesionEj[]) ?? []);
      const mapa: Record<string, MiRespuesta> = {};
      (resp.data ?? []).forEach((r) => {
        mapa[r.sesion_ejercicio_id] = r;
      });
      setRespuestas(mapa);
      setFeedbackEnviado(Boolean(fb.data));
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const marcarHecho = async (seId: string) => {
    if (!userId) return;
    const actual = respuestas[seId]?.completado ?? false;
    const nuevo = !actual;
    setRespuestas({
      ...respuestas,
      [seId]: {
        sesion_ejercicio_id: seId,
        completado: nuevo,
        comentario: respuestas[seId]?.comentario ?? null,
      },
    });
    const supabase = createClient();
    await supabase.from("respuestas_ejercicio").upsert(
      {
        sesion_ejercicio_id: seId,
        jugador_id: userId,
        completado: nuevo,
        comentario: comentarios[seId]?.trim() || respuestas[seId]?.comentario || null,
      },
      { onConflict: "sesion_ejercicio_id,jugador_id" }
    );
  };

  const guardarComentario = async (seId: string) => {
    if (!userId) return;
    const texto = comentarios[seId]?.trim();
    if (!texto) return;
    const supabase = createClient();
    await supabase.from("respuestas_ejercicio").upsert(
      {
        sesion_ejercicio_id: seId,
        jugador_id: userId,
        completado: respuestas[seId]?.completado ?? false,
        comentario: texto,
      },
      { onConflict: "sesion_ejercicio_id,jugador_id" }
    );
    setRespuestas({
      ...respuestas,
      [seId]: {
        sesion_ejercicio_id: seId,
        completado: respuestas[seId]?.completado ?? false,
        comentario: texto,
      },
    });
    setComentarios({ ...comentarios, [seId]: "" });
  };

  const enviarRpe = async () => {
    if (!userId || !sesion || rpe === null || !minutos) return;
    setGuardandoRpe(true);
    const supabase = createClient();
    const { error } = await supabase.from("feedback_sesion").upsert(
      {
        sesion_id: sesion.id,
        jugador_id: userId,
        rpe,
        minutos: Number(minutos),
        comentario: comentarioSesion.trim() || null,
      },
      { onConflict: "sesion_id,jugador_id" }
    );
    if (!error) setFeedbackEnviado(true);
    setGuardandoRpe(false);
  };

  const hechos = ejercicios.filter(
    (e) => respuestas[e.id]?.completado
  ).length;

  return (
    <div className="space-y-5 pb-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <WellnessCheckIn momento="manana" />
        <WellnessCheckIn momento="noche" />
      </div>

      {cargando ? (
        <p className="text-ink/50">Cargando…</p>
      ) : !sesion ? (
        <div className="empty-state">
          <p className="font-display font-black text-5xl text-ink/10 mb-2">—</p>
          <p className="font-display font-bold text-lg mb-1">
            Hoy no hay sesión publicada
          </p>
          <p className="text-ink/60">
            Cuando tu PF publique el entrenamiento del día, lo vas a ver acá. Si
            todavía no estás en un equipo,{" "}
            <Link href="/unirse" className="text-mint font-semibold">
              unite con el código
            </Link>
            .
          </p>
        </div>
      ) : (
      <div className="space-y-5">
      <div>
        <p className="text-sm text-ink/50">{sesion.equipos?.nombre}</p>
        <h1 className="font-display font-black text-2xl leading-tight">
          {sesion.titulo}
        </h1>
        {sesion.notas && (
          <p className="text-sm text-ink/70 mt-1">{sesion.notas}</p>
        )}
        <p className="text-sm font-semibold text-mint mt-2">
          {hechos}/{ejercicios.length} ejercicios hechos
        </p>
      </div>

      <div className="space-y-3">
        {ejercicios.map((e, i) => {
          const hecho = respuestas[e.id]?.completado ?? false;
          const comentarioGuardado = respuestas[e.id]?.comentario;
          const imgs = e.ejercicios?.imagenes_url ?? [];
          return (
            <div key={e.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    <span className="font-display font-black text-tape mr-2">
                      {i + 1}
                    </span>
                    {e.ejercicios?.nombre}
                  </p>
                  <p className="text-xs text-ink/50">
                    {NOMBRE_BLOQUE[e.bloque]}
                    {e.series && ` · ${e.series}×${e.repeticiones ?? "?"}`}
                    {e.carga && ` · ${e.carga}`}
                    {e.duracion_min && ` · ${e.duracion_min} min`}
                  </p>
                  {(e.notas || e.ejercicios?.descripcion) && (
                    <p className="text-sm text-ink/60 mt-1">
                      {e.notas ?? e.ejercicios?.descripcion}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => marcarHecho(e.id)}
                  aria-pressed={hecho}
                  className={
                    hecho
                      ? "btn bg-mint text-chalk shrink-0"
                      : "btn border border-ink/15 shrink-0"
                  }
                >
                  {hecho ? "Hecho ✓" : "Hecho"}
                </button>
              </div>

              <FotosEjercicio
                imagenes={imgs}
                nombre={e.ejercicios?.nombre ?? "ejercicio"}
              />

              {e.ejercicios?.video_url && (
                <div>
                  {videoAbierto === e.id ? (
                    <VideoEmbed url={e.ejercicios.video_url} />
                  ) : (
                    <button
                      onClick={() => setVideoAbierto(e.id)}
                      className="text-mint text-sm font-semibold"
                    >
                      ▶ Ver cómo se hace
                    </button>
                  )}
                </div>
              )}

              {comentarioGuardado ? (
                <p className="text-sm text-ink/60">Vos: “{comentarioGuardado}”</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="field text-sm"
                    placeholder="Comentario (opcional)"
                    value={comentarios[e.id] ?? ""}
                    onChange={(ev) =>
                      setComentarios({ ...comentarios, [e.id]: ev.target.value })
                    }
                  />
                  {comentarios[e.id]?.trim() && (
                    <button
                      onClick={() => guardarComentario(e.id)}
                      className="btn-ghost shrink-0 text-sm"
                    >
                      Guardar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card border-2 border-ink space-y-4">
        <div>
          <h2 className="font-display font-black text-xl">
            ¿Cómo estuvo la sesión?
          </h2>
          <p className="text-sm text-ink/60">
            Cargalo apenas termines: 30 segundos y listo.
          </p>
        </div>
        {feedbackEnviado ? (
          <p className="font-semibold text-mint">
            ✓ Ya enviaste tu RPE de hoy. ¡Buen entrenamiento!
          </p>
        ) : (
          <>
            <RpePicker valor={rpe} onChange={setRpe} />
            <div>
              <label className="label" htmlFor="minutos">
                ¿Cuántos minutos entrenaste?
              </label>
              <input
                id="minutos"
                className="field"
                inputMode="numeric"
                value={minutos}
                onChange={(e) =>
                  setMinutos(e.target.value.replace(/\D/g, ""))
                }
                placeholder="90"
              />
            </div>
            <input
              className="field"
              placeholder="¿Algo que tu PF deba saber? (opcional)"
              value={comentarioSesion}
              onChange={(e) => setComentarioSesion(e.target.value)}
            />
            <button
              onClick={enviarRpe}
              disabled={guardandoRpe || rpe === null || !minutos}
              className="btn-primary w-full"
            >
              {guardandoRpe ? "Enviando…" : "Enviar mi RPE"}
            </button>
          </>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
