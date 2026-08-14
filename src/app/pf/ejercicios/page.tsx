"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BLOQUES, type Bloque, type Ejercicio } from "@/lib/types";

const NOMBRE_BLOQUE = Object.fromEntries(
  BLOQUES.map((b) => [b.valor, b.label])
) as Record<Bloque, string>;

export default function EjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<Bloque>("fuerza");
  const [videoUrl, setVideoUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("ejercicios")
      .select("id, nombre, descripcion, video_url, categoria")
      .eq("pf_id", user.id)
      .order("nombre");
    setEjercicios((data as Ejercicio[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("ejercicios").insert({
      pf_id: user.id,
      nombre,
      categoria,
      video_url: videoUrl.trim() || null,
      descripcion: descripcion.trim() || null,
    });
    if (error) {
      setError("No se pudo guardar el ejercicio.");
      return;
    }
    setNombre("");
    setVideoUrl("");
    setDescripcion("");
    setCreando(false);
    cargar();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-black text-2xl">
          Biblioteca de ejercicios
        </h1>
        <button onClick={() => setCreando(!creando)} className="btn-primary">
          {creando ? "Cancelar" : "Nuevo"}
        </button>
      </div>

      {creando && (
        <div className="card mb-5 space-y-3">
          <div>
            <label className="label" htmlFor="ej-nombre">
              Nombre
            </label>
            <input
              id="ej-nombre"
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Sentadilla con barra"
            />
          </div>
          <div>
            <label className="label" htmlFor="ej-cat">
              Bloque habitual
            </label>
            <select
              id="ej-cat"
              className="field"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Bloque)}
            >
              {BLOQUES.map((b) => (
                <option key={b.valor} value={b.valor}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ej-video">
              Link del video de referencia (YouTube)
            </label>
            <input
              id="ej-video"
              className="field"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/…"
              inputMode="url"
            />
          </div>
          <div>
            <label className="label" htmlFor="ej-desc">
              Indicaciones (opcional)
            </label>
            <textarea
              id="ej-desc"
              className="field"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Puntos técnicos clave, errores a evitar…"
            />
          </div>
          {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
          <button
            onClick={crear}
            disabled={!nombre.trim()}
            className="btn-primary"
          >
            Guardar ejercicio
          </button>
        </div>
      )}

      {cargando ? (
        <p className="text-ink/50">Cargando…</p>
      ) : ejercicios.length === 0 && !creando ? (
        <div className="card text-center py-10">
          <p className="font-display font-bold text-lg mb-1">
            Tu biblioteca está vacía
          </p>
          <p className="text-ink/60 mb-4">
            Cargá tus ejercicios una vez y reusalos en todas las sesiones de
            todos tus equipos.
          </p>
          <button onClick={() => setCreando(true)} className="btn-primary">
            Cargar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ejercicios.map((e) => (
            <div key={e.id} className="card flex items-start justify-between">
              <div>
                <p className="font-semibold">{e.nombre}</p>
                <p className="text-xs text-ink/50">
                  {NOMBRE_BLOQUE[e.categoria]}
                </p>
                {e.descripcion && (
                  <p className="text-sm text-ink/60 mt-1">{e.descripcion}</p>
                )}
              </div>
              {e.video_url && (
                <a
                  href={e.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-grass text-sm font-semibold shrink-0 ml-3"
                >
                  Ver video
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
