"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Unirse() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const unirse = async () => {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("unirse_a_equipo", {
      codigo_input: codigo,
    });
    if (error) {
      setError("No pudimos procesar el código. Probá de nuevo.");
      setCargando(false);
      return;
    }
    if (!data?.ok) {
      setError(data?.error ?? "Código inválido.");
      setCargando(false);
      return;
    }
    router.push("/jugador");
    router.refresh();
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display font-black text-2xl mb-2">
          Unite a tu plantel
        </h1>
        <p className="text-ink/60 mb-6">
          Pedile a tu preparador físico el código del equipo.
        </p>
        <input
          className="field text-center font-mono text-2xl tracking-[0.35em] uppercase"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          aria-label="Código del equipo"
        />
        {error && (
          <p className="text-sm text-rpe-max font-medium mt-3">{error}</p>
        )}
        <button
          onClick={unirse}
          disabled={cargando || codigo.length < 6}
          className="btn-primary w-full mt-4"
        >
          {cargando ? "Uniéndote…" : "Unirme"}
        </button>
      </div>
    </main>
  );
}
