"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ExportarExcel({
  equipoId,
  nombreEquipo,
}: {
  equipoId: string;
  nombreEquipo: string;
}) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportar = async () => {
    setExportando(true);
    setError(null);
    try {
      const supabase = createClient();
      const XLSX = await import("xlsx");

      // 1) Cargas por sesión (sRPE de cada jugador)
      const { data: feedback } = await supabase
        .from("feedback_sesion")
        .select(
          "rpe, minutos, carga, comentario, profiles(nombre), sesiones!inner(fecha, titulo, equipo_id)"
        )
        .eq("sesiones.equipo_id", equipoId);

      // 2) Ejercicios de las sesiones del equipo
      const { data: sesEj } = await supabase
        .from("sesion_ejercicios")
        .select(
          "id, bloque, ejercicios(nombre), sesiones!inner(fecha, titulo, equipo_id)"
        )
        .eq("sesiones.equipo_id", equipoId);

      const listaSe = (sesEj as any[]) ?? [];
      const mapaSe: Record<string, any> = {};
      listaSe.forEach((s) => {
        mapaSe[s.id] = s;
      });

      // 3) Respuestas de los jugadores por ejercicio
      let respuestas: any[] = [];
      if (listaSe.length > 0) {
        const { data: resp } = await supabase
          .from("respuestas_ejercicio")
          .select(
            "sesion_ejercicio_id, completado, comentario, profiles(nombre)"
          )
          .in(
            "sesion_ejercicio_id",
            listaSe.map((s) => s.id)
          );
        respuestas = (resp as any[]) ?? [];
      }

      // 4) Plantel y wellness
      const { data: miembros } = await supabase
        .from("miembros_equipo")
        .select("jugador_id, activo, created_at, profiles(nombre)")
        .eq("equipo_id", equipoId);

      const listaMiembros = (miembros as any[]) ?? [];
      let wellness: any[] = [];
      if (listaMiembros.length > 0) {
        const { data: w } = await supabase
          .from("wellness")
          .select(
            "fecha, sueno, fatiga, dolor_muscular, estres, animo, comentario, profiles(nombre)"
          )
          .in(
            "jugador_id",
            listaMiembros.map((m) => m.jugador_id)
          );
        wellness = (w as any[]) ?? [];
      }

      // ---- Hoja: Cargas (sRPE) ----
      const filasCargas = ((feedback as any[]) ?? [])
        .map((f) => ({
          Jugador: f.profiles?.nombre ?? "",
          Fecha: f.sesiones?.fecha ?? "",
          Sesion: f.sesiones?.titulo ?? "",
          RPE: Number(f.rpe),
          Minutos: f.minutos,
          "Carga (UA)": Math.round(Number(f.carga)),
          Comentario: f.comentario ?? "",
        }))
        .sort(
          (a, b) =>
            String(a.Fecha).localeCompare(String(b.Fecha)) ||
            String(a.Jugador).localeCompare(String(b.Jugador))
        );

      // ---- Hoja: Resumen por jugador ----
      const acum: Record<
        string,
        { sesiones: number; rpe: number; minutos: number; carga: number }
      > = {};
      filasCargas.forEach((f) => {
        const j = String(f.Jugador);
        if (!acum[j]) acum[j] = { sesiones: 0, rpe: 0, minutos: 0, carga: 0 };
        acum[j].sesiones += 1;
        acum[j].rpe += Number(f.RPE);
        acum[j].minutos += Number(f.Minutos);
        acum[j].carga += Number(f["Carga (UA)"]);
      });
      const filasResumen = Object.entries(acum)
        .map(([jugador, a]) => ({
          Jugador: jugador,
          "Sesiones con RPE": a.sesiones,
          "RPE promedio": Math.round((a.rpe / a.sesiones) * 10) / 10,
          "Minutos totales": a.minutos,
          "Carga total (UA)": a.carga,
        }))
        .sort((a, b) => b["Carga total (UA)"] - a["Carga total (UA)"]);

      // ---- Hoja: Por ejercicio ----
      const filasEjercicio = respuestas
        .map((r) => {
          const se = mapaSe[r.sesion_ejercicio_id] ?? {};
          return {
            Jugador: r.profiles?.nombre ?? "",
            Fecha: se.sesiones?.fecha ?? "",
            Sesion: se.sesiones?.titulo ?? "",
            Bloque: se.bloque ?? "",
            Ejercicio: se.ejercicios?.nombre ?? "",
            Completado: r.completado ? "Si" : "No",
            Comentario: r.comentario ?? "",
          };
        })
        .sort(
          (a, b) =>
            String(a.Fecha).localeCompare(String(b.Fecha)) ||
            String(a.Jugador).localeCompare(String(b.Jugador))
        );

      // ---- Hoja: Wellness ----
      const filasWellness = wellness
        .map((w) => ({
          Jugador: w.profiles?.nombre ?? "",
          Fecha: w.fecha ?? "",
          "Sueño (1-5)": w.sueno,
          "Fatiga (1-5)": w.fatiga,
          "Dolor muscular (1-5)": w.dolor_muscular,
          "Estrés (1-5)": w.estres,
          "Ánimo (1-5)": w.animo,
          Comentario: w.comentario ?? "",
        }))
        .sort(
          (a, b) =>
            String(a.Fecha).localeCompare(String(b.Fecha)) ||
            String(a.Jugador).localeCompare(String(b.Jugador))
        );

      // ---- Hoja: Plantel ----
      const filasPlantel = listaMiembros
        .map((m) => ({
          Jugador: m.profiles?.nombre ?? "",
          Activo: m.activo ? "Si" : "No",
          "Se unió": String(m.created_at ?? "").slice(0, 10),
        }))
        .sort((a, b) => String(a.Jugador).localeCompare(String(b.Jugador)));

      // ---- Armar el archivo ----
      const wb = XLSX.utils.book_new();
      const agregarHoja = (
        nombre: string,
        filas: any[],
        headers: string[]
      ) => {
        const ws =
          filas.length > 0
            ? XLSX.utils.json_to_sheet(filas)
            : XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, nombre);
      };

      agregarHoja("Cargas (sRPE)", filasCargas, [
        "Jugador",
        "Fecha",
        "Sesion",
        "RPE",
        "Minutos",
        "Carga (UA)",
        "Comentario",
      ]);
      agregarHoja("Resumen jugadores", filasResumen, [
        "Jugador",
        "Sesiones con RPE",
        "RPE promedio",
        "Minutos totales",
        "Carga total (UA)",
      ]);
      agregarHoja("Por ejercicio", filasEjercicio, [
        "Jugador",
        "Fecha",
        "Sesion",
        "Bloque",
        "Ejercicio",
        "Completado",
        "Comentario",
      ]);
      agregarHoja("Wellness", filasWellness, [
        "Jugador",
        "Fecha",
        "Sueño (1-5)",
        "Fatiga (1-5)",
        "Dolor muscular (1-5)",
        "Estrés (1-5)",
        "Ánimo (1-5)",
        "Comentario",
      ]);
      agregarHoja("Plantel", filasPlantel, ["Jugador", "Activo", "Se unió"]);

      const hoy = new Date().toISOString().slice(0, 10);
      const slug =
        nombreEquipo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "equipo";
      XLSX.writeFile(wb, `plantel-${slug}-${hoy}.xlsx`);
    } catch {
      setError("No se pudo exportar. Probá de nuevo.");
    }
    setExportando(false);
  };

  return (
    <>
      <button onClick={exportar} disabled={exportando} className="btn-ghost">
        {exportando ? "Exportando…" : "Exportar Excel"}
      </button>
      {error && (
        <p className="text-sm text-rpe-max font-medium w-full">{error}</p>
      )}
    </>
  );
}
