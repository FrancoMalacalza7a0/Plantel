"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BLOQUES, type Bloque, type Ejercicio } from "@/lib/types";

const NOMBRE_BLOQUE = Object.fromEntries(
  BLOQUES.map((b) => [b.valor, b.label])
) as Record<Bloque, string>;

// Reduce la foto a máx 1600px y la pasa a JPEG para que no pese.
// Si el navegador no puede procesarla, se sube el archivo original.
async function comprimirImagen(
  file: File
): Promise<{ blob: Blob; ext: string; tipo: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const MAX = 1600;
    const escala = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85)
    );
    if (!blob) throw new Error("sin blob");
    return { blob, ext: "jpg", tipo: "image/jpeg" };
  } catch {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    return { blob: file, ext, tipo: file.type || "image/jpeg" };
  }
}

export default function EjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<Bloque>("fuerza");
  const [videoUrl, setVideoUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("ejercicios")
      .select("id, nombre, descripcion, video_url, imagenes_url, categoria")
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
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGuardando(false);
      return;
    }

    const urls: string[] = [];
    if (archivos.length > 0) {
      try {
        for (const archivo of archivos) {
          const { blob, ext, tipo } = await comprimirImagen(archivo);
          const ruta = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: eSubida } = await supabase.storage
            .from("ejercicios")
            .upload(ruta, blob, { contentType: tipo });
          if (eSubida) throw eSubida;
          const { data: pub } = supabase.storage
            .from("ejercicios")
            .getPublicUrl(ruta);
          urls.push(pub.publicUrl);
        }
      } catch {
        setError(
          "No se pudieron subir las fotos. Probá con otras o guardá sin fotos."
        );
        setGuardando(false);
        return;
      }
    }

    const { error: eInsert } = await supabase.from("ejercicios").insert({
      pf_id: user.id,
      nombre,
      categoria,
      video_url: videoUrl.trim() || null,
      imagenes_url: urls.length > 0 ? urls : null,
      descripcion: descripcion.trim() || null,
    });
    if (eInsert) {
      setError("No se pudo guardar el ejercicio.");
      setGuardando(false);
      return;
    }
    setNombre("");
    setVideoUrl("");
    setDescripcion("");
    setArchivos([]);
    setCreando(false);
    setGuardando(false);
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
            <label className="label" htmlFor="ej-foto">
              Fotos de referencia (opcional, hasta 3)
            </label>
            <input
              id="ej-foto"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setArchivos(Array.from(e.target.files ?? []).slice(0, 3))
              }
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-ink/5 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-ink/10"
            />
            <p className="text-xs text-ink/50 mt-1">
              {archivos.length > 0
                ? `${archivos.length} foto${archivos.length > 1 ? "s" : ""} seleccionada${archivos.length > 1 ? "s" : ""} — se comprimen solas al subir`
                : "Hasta 3 fotos."}
            </p>
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
            disabled={!nombre.trim() || guardando}
            className="btn-primary"
          >
            {guardando ? "Guardando…" : "Guardar ejercicio"}
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
            <div key={e.id} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {e.imagenes_url && e.imagenes_url.length > 0 && (
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imagenes_url[0]}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-ink/10"
                      loading="lazy"
                    />
                    {e.imagenes_url.length > 1 && (
                      <span className="absolute -bottom-1 -right-1 bg-ink text-white text-[10px] font-bold rounded-md px-1">
                        +{e.imagenes_url.length - 1}
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{e.nombre}</p>
                  <p className="text-xs text-ink/50">
                    {NOMBRE_BLOQUE[e.categoria]}
                  </p>
                  {e.descripcion && (
                    <p className="text-sm text-ink/60 mt-1">{e.descripcion}</p>
                  )}
                </div>
              </div>
              {e.video_url && (
                <a
                  href={e.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-grass text-sm font-semibold shrink-0"
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
