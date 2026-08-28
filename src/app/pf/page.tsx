"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Equipo } from "@/lib/types";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [deporte, setDeporte] = useState("futbol");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("equipos")
      .select("id, nombre, deporte, codigo_invitacion")
      .order("created_at", { ascending: true });
    setEquipos(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearEquipo = async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("equipos")
      .insert({ nombre, deporte, pf_id: user.id });
    if (error) {
      setError("No se pudo crear el equipo. Probá de nuevo.");
      return;
    }
    setNombre("");
    setCreando(false);
    cargar();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-black text-2xl">Tus equipos</h1>
        <button onClick={() => setCreando(!creando)} className="btn-primary">
          {creando ? "Cancelar" : "Nuevo equipo"}
        </button>
      </div>

      {creando && (
        <div className="card mb-5 space-y-3">
          <div>
            <label className="label" htmlFor="nombre-eq">
              Nombre del equipo
            </label>
            <input
              id="nombre-eq"
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Primera División — Club Atlético"
            />
          </div>
          <div>
            <label className="label" htmlFor="deporte">
              Deporte
            </label>
            <select
              id="deporte"
              className="field"
              value={deporte}
              onChange={(e) => setDeporte(e.target.value)}
            >
              <option value="futbol">Fútbol</option>
              <option value="futsal">Futsal</option>
              <option value="basquet">Básquet</option>
              <option value="rugby">Rugby</option>
              <option value="hockey">Hockey</option>
              <option value="voley">Vóley</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
          <button
            onClick={crearEquipo}
            disabled={!nombre.trim()}
            className="btn-primary"
          >
            Crear equipo
          </button>
        </div>
      )}

      {cargando ? (
        <p className="text-ink/50">Cargando…</p>
      ) : equipos.length === 0 && !creando ? (
        <div className="empty-state">
          <p className="font-display font-black text-5xl text-ink/10 mb-2">⚽</p>
          <p className="font-display font-bold text-lg mb-1">
            Todavía no armaste ningún equipo
          </p>
          <p className="text-ink/60 mb-4">
            Creá el primero y compartí el código con tu plantel para que se
            unan.
          </p>
          <button onClick={() => setCreando(true)} className="btn-primary">
            Crear mi primer equipo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {equipos.map((e) => (
            <Link
              key={e.id}
              href={`/pf/equipos/${e.id}`}
              className="card card-link flex items-center justify-between"
            >
              <div>
                <p className="font-display font-bold text-lg leading-tight">
                  {e.nombre}
                </p>
                <p className="text-sm text-ink/50 capitalize">{e.deporte}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold">
                  Código
                </p>
                <p className="font-mono font-bold text-grass tracking-[0.2em]">
                  {e.codigo_invitacion}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
