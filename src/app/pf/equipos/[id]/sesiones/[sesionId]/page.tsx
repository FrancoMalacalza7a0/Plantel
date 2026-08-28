"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FotosEjercicio from "@/components/FotosEjercicio";
import { BLOQUES, type Bloque } from "@/lib/types";

const NOMBRE_BLOQUE = Object.fromEntries(
  BLOQUES.map((b) => [b.valor, b.label])
) as Record<Bloque, string>;

interface SesionEj {
  id: string;
  bloque: Bloque;
  orden: number;
  series: number | null;
  repeticiones: string | null;
  carga: string | null;
  duracion_min: number | null;
  notas: string | null;
  ejercicios: {
    nombre: string;
    video_url: string | null;
    imagenes_url: string[] | null;
  } | null;
}

interface Respuesta {
  sesion_ejercicio_id: string;
  completado: boolean;
  comentario: string | null;
  jugador_id: string;
}

interface Feedback {
  jugador_id: string;
  rpe: number;
  minutos: number;
  carga: number;
  comentario: string | null;
  profiles: { nombre: string } | null;
}

export default function SesionPfPage() {
  const params = useParams<{ id: string; sesionId: string }>();
  const { id: equipoId, sesionId } = params;

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState<string | null>(null);
  const [ejercicios, setEjercicios] = useState<SesionEj[]>([]);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const [se, ej, fb] = await Promise.all([
      supabase
        .from("sesiones")
        .select("titulo, fecha, notas")
        .eq("id", sesionId)
        .single(),
      supabase
        .from("sesion_ejercicios")
        .select(
          "id, bloque, orden, series, repeticiones, carga, duracion_min, notas, ejercicios(nombre, video_url, imagenes_url)"
        )
        .eq("sesion_id", sesionId)
        .order("orden"),
      supabase
        .from("feedback_sesion")
        .select("jugador_id, rpe, minutos, carga, comentario, profiles(nombre)")
        .eq("sesion_id", sesionId),
    ]);
    if (se.data) {
      setTitulo(se.data.titulo);
      setFecha(se.data.fecha);
      setNotas(se.data.notas);
    }
    const listaEj = (ej.data as unknown as SesionEj[]) ?? [];
    setEjercicios(listaEj);
    setFeedbacks((fb.data as unknown as Feedback[]) ?? []);

    if (listaEj.length > 0) {
      const { data: resp } = await supabase
        .from("respuestas_ejercicio")
        .select("sesion_ejercicio_id, completado, comentario, jugador_id")
        .in(
          "sesion_ejercicio_id",
          listaEj.map((e) => e.id)
        );
      setRespuestas(resp ?? []);
    }
    setCargando(false);
  }, [sesionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="text-ink/50">Cargando…</p>;

  const cargaPromedio =
    feedbacks.length > 0
      ? Math.round(
          feedbacks.reduce((acc, f) => acc + Number(f.carga), 0) /
            feedbacks.length
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/pf/equipos/${equipoId}`}
          className="text-sm text-ink/50 hover:text-ink"
        >
          ← Volver al equipo
        </Link>
        <h1 className="font-display font-black text-2xl mt-1">{titulo}</h1>
        <p className="text-ink/50">{fecha}</p>
        {notas && <p className="text-sm text-ink/70 mt-1">{notas}</p>}
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-2">Ejercicios</h2>
        <div className="space-y-2">
          {ejercicios.map((e, i) => {
            const resp = respuestas.filter(
              (r) => r.sesion_ejercicio_id === e.id
            );
            const hechos = resp.filter((r) => r.completado).length;
            const comentarios = resp.filter((r) => r.comentario);
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
                    {e.notas && (
                      <p className="text-sm text-ink/60 mt-1">{e.notas}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-ink/60 shrink-0">
                    {hechos} ✓
                  </span>
                </div>

                <FotosEjercicio
                  imagenes={imgs}
                  nombre={e.ejercicios?.nombre ?? "ejercicio"}
                />

                {e.ejercicios?.video_url && (
                  <a
                    href={e.ejercicios.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mint text-sm font-semibold inline-block"
                  >
                    ▶ Ver video de referencia
                  </a>
                )}

                {comentarios.length > 0 && (
                  <div className="border-t border-ink/5 pt-2 space-y-1">
                    {comentarios.map((c, idx) => (
                      <p key={idx} className="text-sm text-ink/60">
                        “{c.comentario}”
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-display font-bold text-lg">
            Carga del plantel (sRPE)
          </h2>
          {cargaPromedio !== null && (
            <p className="text-sm text-ink/60">
              Promedio:{" "}
              <span className="font-display font-black text-ink">
                {cargaPromedio}
              </span>{" "}
              UA
            </p>
          )}
        </div>
        {feedbacks.length === 0 ? (
          <p className="text-ink/60 text-sm">
            Todavía nadie cargó su RPE. Aparece acá apenas lo hagan.
          </p>
        ) : (
          <div className="card divide-y divide-ink/5">
            {feedbacks.map((f) => (
              <div key={f.jugador_id} className="py-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {f.profiles?.nombre ?? "Jugador"}
                  </p>
                  <p className="text-sm">
                    RPE{" "}
                    <span className="font-display font-black">{f.rpe}</span> ·{" "}
                    {f.minutos} min ·{" "}
                    <span className="font-display font-black">
                      {Math.round(Number(f.carga))}
                    </span>{" "}
                    UA
                  </p>
                </div>
                {f.comentario && (
                  <p className="text-sm text-ink/60 mt-0.5">“{f.comentario}”</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
