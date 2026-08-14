"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BLOQUES, type Bloque, type Ejercicio } from "@/lib/types";

interface ItemSesion {
  ejercicio: Ejercicio;
  bloque: Bloque;
  series: string;
  repeticiones: string;
  carga: string;
  duracion_min: string;
  notas: string;
}

export default function NuevaSesionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const equipoId = params.id;

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [biblioteca, setBiblioteca] = useState<Ejercicio[]>([]);
  const [items, setItems] = useState<ItemSesion[]>([]);
  const [seleccion, setSeleccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarBiblioteca = async () => {
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
      setBiblioteca((data as Ejercicio[]) ?? []);
    };
    cargarBiblioteca();
  }, []);

  const agregar = () => {
    const ej = biblioteca.find((e) => e.id === seleccion);
    if (!ej) return;
    setItems([
      ...items,
      {
        ejercicio: ej,
        bloque: ej.categoria,
        series: "",
        repeticiones: "",
        carga: "",
        duracion_min: "",
        notas: "",
      },
    ]);
    setSeleccion("");
  };

  const actualizar = (i: number, campo: keyof ItemSesion, valor: string) => {
    const copia = [...items];
    // @ts-expect-error asignación dinámica de campos string
    copia[i][campo] = valor;
    setItems(copia);
  };

  const quitar = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { data: sesion, error: e1 } = await supabase
      .from("sesiones")
      .insert({
        equipo_id: equipoId,
        fecha,
        titulo: titulo.trim(),
        notas: notas.trim() || null,
      })
      .select("id")
      .single();
    if (e1 || !sesion) {
      setError("No se pudo crear la sesión.");
      setGuardando(false);
      return;
    }
    if (items.length > 0) {
      const filas = items.map((it, i) => ({
        sesion_id: sesion.id,
        ejercicio_id: it.ejercicio.id,
        bloque: it.bloque,
        orden: i,
        series: it.series ? Number(it.series) : null,
        repeticiones: it.repeticiones.trim() || null,
        carga: it.carga.trim() || null,
        duracion_min: it.duracion_min ? Number(it.duracion_min) : null,
        notas: it.notas.trim() || null,
      }));
      const { error: e2 } = await supabase
        .from("sesion_ejercicios")
        .insert(filas);
      if (e2) {
        setError("La sesión se creó pero falló la carga de ejercicios.");
        setGuardando(false);
        return;
      }
    }
    router.push(`/pf/equipos/${equipoId}/sesiones/${sesion.id}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/pf/equipos/${equipoId}`}
          className="text-sm text-ink/50 hover:text-ink"
        >
          ← Volver al equipo
        </Link>
        <h1 className="font-display font-black text-2xl mt-1">Nueva sesión</h1>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="fecha">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              className="field"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="titulo">
              Título
            </label>
            <input
              id="titulo"
              className="field"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Fuerza + campo"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notas">
            Notas para el plantel (opcional)
          </label>
          <input
            id="notas"
            className="field"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Traer canilleras, arrancamos 9:00 en el gimnasio"
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg">Ejercicios</h2>

        {biblioteca.length === 0 ? (
          <p className="text-sm text-ink/60">
            Tu biblioteca está vacía.{" "}
            <Link href="/pf/ejercicios" className="text-grass font-semibold">
              Cargá ejercicios
            </Link>{" "}
            y volvé a armar la sesión.
          </p>
        ) : (
          <div className="flex gap-2">
            <select
              className="field flex-1"
              value={seleccion}
              onChange={(e) => setSeleccion(e.target.value)}
              aria-label="Elegir ejercicio de la biblioteca"
            >
              <option value="">Elegir de la biblioteca…</option>
              {biblioteca.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={agregar}
              disabled={!seleccion}
              className="btn-primary shrink-0"
            >
              Agregar
            </button>
          </div>
        )}

        {items.map((it, i) => (
          <div key={i} className="card space-y-3">
            <div className="flex items-start justify-between">
              <p className="font-semibold">
                <span className="font-display font-black text-grass mr-2">
                  {i + 1}
                </span>
                {it.ejercicio.nombre}
              </p>
              <button
                onClick={() => quitar(i)}
                className="text-sm text-ink/40 hover:text-rpe-max"
              >
                Quitar
              </button>
            </div>
            <div>
              <label className="label">Bloque</label>
              <select
                className="field"
                value={it.bloque}
                onChange={(e) => actualizar(i, "bloque", e.target.value)}
              >
                {BLOQUES.map((b) => (
                  <option key={b.valor} value={b.valor}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="label">Series</label>
                <input
                  className="field"
                  inputMode="numeric"
                  value={it.series}
                  onChange={(e) => actualizar(i, "series", e.target.value)}
                  placeholder="4"
                />
              </div>
              <div>
                <label className="label">Reps</label>
                <input
                  className="field"
                  value={it.repeticiones}
                  onChange={(e) =>
                    actualizar(i, "repeticiones", e.target.value)
                  }
                  placeholder="8-10"
                />
              </div>
              <div>
                <label className="label">Carga</label>
                <input
                  className="field"
                  value={it.carga}
                  onChange={(e) => actualizar(i, "carga", e.target.value)}
                  placeholder="70% / 40 kg"
                />
              </div>
              <div>
                <label className="label">Minutos</label>
                <input
                  className="field"
                  inputMode="numeric"
                  value={it.duracion_min}
                  onChange={(e) =>
                    actualizar(i, "duracion_min", e.target.value)
                  }
                  placeholder="15"
                />
              </div>
            </div>
            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="field"
                value={it.notas}
                onChange={(e) => actualizar(i, "notas", e.target.value)}
                placeholder="Última serie al fallo controlado"
              />
            </div>
          </div>
        ))}
      </section>

      {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
      <button
        onClick={guardar}
        disabled={guardando || !titulo.trim() || items.length === 0}
        className="btn-primary w-full"
      >
        {guardando ? "Guardando…" : "Guardar y publicar la sesión"}
      </button>
    </div>
  );
}
