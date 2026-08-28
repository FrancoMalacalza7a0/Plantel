"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Estado = "verificando" | "listo" | "invalido" | "guardando" | "hecho";

export default function ActualizarClave() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verificar = async () => {
      const supabase = createClient();
      const code = new URL(window.location.href).searchParams.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          // seguimos: puede que la sesión ya esté activa igual
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEstado(session ? "listo" : "invalido");
    };
    verificar();
  }, []);

  const guardar = async () => {
    setError(null);
    if (pass.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (pass !== pass2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEstado("guardando");
    const supabase = createClient();
    const { error: e } = await supabase.auth.updateUser({ password: pass });
    if (e) {
      setError("No se pudo actualizar. Probá de nuevo o pedí otro link.");
      setEstado("listo");
      return;
    }
    setEstado("hecho");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();
      router.push(perfil?.rol === "pf" ? "/pf" : "/jugador");
      router.refresh();
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-display font-bold uppercase tracking-[0.25em] text-grass text-sm mb-2">
          Plantel
        </p>
        <h1 className="font-display font-black text-2xl mb-4">
          Nueva contraseña
        </h1>

        {estado === "verificando" && <p className="text-ink/50">Verificando el link…</p>}

        {estado === "invalido" && (
          <div className="card space-y-4">
            <p className="text-ink/70">
              El link expiró, ya se usó, o se abrió en un navegador distinto al
              que pidió el cambio.
            </p>
            <Link href="/recuperar" className="btn-primary">
              Pedir un link nuevo
            </Link>
          </div>
        )}

        {(estado === "listo" || estado === "guardando") && (
          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="pass">Nueva contraseña</label>
              <input
                id="pass"
                type="password"
                className="field"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="label" htmlFor="pass2">Repetila</label>
              <input
                id="pass2"
                type="password"
                className="field"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
            <button
              onClick={guardar}
              disabled={estado === "guardando" || !pass || !pass2}
              className="btn-primary w-full"
            >
              {estado === "guardando" ? "Guardando…" : "Guardar y entrar"}
            </button>
          </div>
        )}

        {estado === "hecho" && (
          <p className="text-grass font-semibold">✓ Listo, entrando…</p>
        )}
      </div>
    </main>
  );
}
