"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExportarExcel from "@/components/ExportarExcel";
import type { Equipo, Sesion } from "@/lib/types";

interface Miembro {
  jugador_id: string;
  activo: boolean;
  profiles: { nombre: string } | null;
}

export default function EquipoPage() {
  const params = useParams<{ id: string }>();
  const equipoId = params.id;

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const [eq, mi, se] = await Promise.all([
      supabase
        .from("equipos")
        .select("id, nombre, deporte, codigo_invitacion")
        .eq("id", equipoId)
        .single(),
      supabase
        .from("miembros_equipo")
        .select("jugador_id, activo, profiles(nombre)")
        .eq("equipo_id", equipoId)
        .eq("activo", true),
      supabase
        .from("sesiones")
        .select("id, equipo_id, fecha, titulo, notas")
        .eq("equipo_id", equipoId)
        .order("fecha", { ascending: false })
        .limit(30),
    ]);
    setEquipo(eq.data);
    setMiembros((mi.data as unknown as Miembro[]) ?? []);
    setSesiones(se.data ?? []);
    setCargando(false);
  }, [equipoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="text-ink/50">Cargando…</p>;
  if (!equipo) return <p className="text-ink/50">No encontramos el equipo.</p>;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pf" className="text-sm text-ink/50 hover:text-ink">
          ← Equipos
        </Link>
        <h1 className="font-display font-black text-2xl leading-tight mt-1">
          {equipo.nombre}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Link
            href={`/pf/equipos/${equipo.id}/sesiones/nueva`}
            className="btn-primary"
          >
            Nueva sesión
          </Link>
          <Link href={`/pf/equipos/${equipo.id}/panel`} className="btn-ghost">
            Panel y KPIs
          </Link>
          <ExportarExcel equipoId={equipo.id} nombreEquipo={equipo.nombre} />
        </div>
      </div>

      <div className="card">
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-1">
          Código para que se unan los jugadores
        </p>
        <p className="font-mono font-black text-3xl tracking-[0.3em] text-grass">
          {equipo.codigo_invitacion}
        </p>
        <p className="text-sm text-ink/60 mt-2">
          Pasáselo por WhatsApp: cada jugador crea su cuenta y lo carga en
          «Unirme a un equipo».
        </p>
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-2">
          Plantel ({miembros.length})
        </h2>
        {miembros.length === 0 ? (
          <p className="text-ink/60 text-sm">
            Todavía no se unió nadie. Compartí el código de arriba.
          </p>
        ) : (
          <div className="card divide-y divide-ink/5">
            {miembros.map((m) => (
              <p key={m.jugador_id} className="py-2 font-medium">
                {m.profiles?.nombre ?? "Jugador"}
              </p>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-2">Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="text-ink/60 text-sm">
            Aún no hay sesiones. Armá la primera con «Nueva sesión».
          </p>
        ) : (
          <div className="space-y-2">
            {sesiones.map((s) => (
              <Link
                key={s.id}
                href={`/pf/equipos/${equipo.id}/sesiones/${s.id}`}
                className="card flex items-center justify-between hover:border-grass transition-colors"
              >
                <div>
                  <p className="font-semibold">{s.titulo}</p>
                  <p className="text-sm text-ink/50">{s.fecha}</p>
                </div>
                {s.fecha === hoy && (
                  <span className="text-xs font-bold uppercase tracking-wide bg-tape/20 text-ink px-2 py-1 rounded-lg">
                    Hoy
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
