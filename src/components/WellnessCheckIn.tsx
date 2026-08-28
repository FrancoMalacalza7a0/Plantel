"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Campo = "sueno" | "fatiga" | "dolor_muscular" | "estres" | "animo";
type Momento = "manana" | "noche";

const PREGUNTAS: Record<Campo, { label: string; etiquetas: string[] }> = {
  sueno: {
    label: "¿Cómo dormiste?",
    etiquetas: ["Excelente", "Buena", "Normal", "Mala", "Muy mala"],
  },
  fatiga: {
    label: "¿Cómo está tu cansancio?",
    etiquetas: ["Nada cansado", "Poco", "Normal", "Bastante", "Extremo"],
  },
  dolor_muscular: {
    label: "¿Dolor muscular?",
    etiquetas: ["Nada", "Poco", "Normal", "Bastante", "Mucho"],
  },
  estres: {
    label: "¿Nivel de estrés?",
    etiquetas: ["Nada", "Poco", "Normal", "Bastante", "Mucho"],
  },
  animo: {
    label: "¿Cómo es tu ánimo?",
    etiquetas: ["Muy bueno", "Bueno", "Normal", "Bajo", "Muy bajo"],
  },
};

const CAMPOS_POR_MOMENTO: Record<Momento, Campo[]> = {
  manana: ["sueno", "fatiga", "dolor_muscular", "estres", "animo"],
  noche: ["fatiga", "dolor_muscular", "animo"],
};

const TITULO: Record<Momento, string> = {
  manana: "¿Cómo te levantaste?",
  noche: "¿Cómo te sentís esta noche?",
};

function claseValor(activo: boolean, n: number): string {
  const base =
    "h-9 rounded-lg font-display font-black text-sm transition-all duration-150 active:scale-90 border ";
  if (!activo) return base + "border-ink/15 bg-white text-ink/40 hover:bg-ink/5";
  if (n <= 2) return base + "border-transparent bg-rpe-low text-white";
  if (n === 3) return base + "border-transparent bg-rpe-mid text-white";
  if (n === 4) return base + "border-transparent bg-rpe-high text-white";
  return base + "border-transparent bg-rpe-max text-white";
}

export default function WellnessCheckIn({ momento }: { momento: Momento }) {
  const campos = CAMPOS_POR_MOMENTO[momento];
  const [cargando, setCargando] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<Partial<Record<Campo, number>>>({});
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCargando(false);
        return;
      }
      const hoy = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("wellness")
        .select("sueno, fatiga, dolor_muscular, estres, animo, comentario")
        .eq("jugador_id", user.id)
        .eq("fecha", hoy)
        .eq("momento", momento)
        .maybeSingle();
      if (data) {
        setValores(data);
        setComentario(data.comentario ?? "");
        setEnviado(true);
      }
      setCargando(false);
    };
    cargar();
  }, [momento]);

  const completo = campos.every((c) => valores[c] != null);

  const guardar = async () => {
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGuardando(false);
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    const fila: Record<string, unknown> = {
      jugador_id: user.id,
      fecha: hoy,
      momento,
      comentario: comentario.trim() || null,
    };
    campos.forEach((c) => {
      fila[c] = valores[c];
    });
    const { error } = await supabase
      .from("wellness")
      .upsert(fila, { onConflict: "jugador_id,fecha,momento" });
    if (!error) {
      setEnviado(true);
      setEditando(false);
    }
    setGuardando(false);
  };

  if (cargando) return null;

  if (enviado && !editando) {
    return (
      <div className="card flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">{TITULO[momento]}</p>
          <p className="text-sm text-grass font-medium">✓ Registrado</p>
        </div>
        <button
          onClick={() => setEditando(true)}
          className="btn-ghost text-sm shrink-0"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <p className="font-display font-bold">{TITULO[momento]}</p>
      {campos.map((campo) => (
        <div key={campo}>
          <p className="text-sm font-semibold text-ink/80 mb-1.5">
            {PREGUNTAS[campo].label}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValores({ ...valores, [campo]: n })}
                className={claseValor(valores[campo] === n, n)}
                aria-pressed={valores[campo] === n}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/50 mt-1 min-h-4">
            {valores[campo]
              ? PREGUNTAS[campo].etiquetas[valores[campo]! - 1]
              : ""}
          </p>
        </div>
      ))}
      <input
        className="field text-sm"
        placeholder="Comentario (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando || !completo}
          className="btn-primary flex-1"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {editando && (
          <button onClick={() => setEditando(false)} className="btn-ghost">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
