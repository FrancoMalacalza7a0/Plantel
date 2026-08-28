"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async () => {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error || !data.user) {
      setError("Email o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", data.user.id)
      .single();
    router.push(perfil?.rol === "pf" ? "/pf" : "/jugador");
    router.refresh();
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-display font-bold uppercase tracking-[0.25em] text-grass text-sm mb-2">
          Plantel
        </p>
        <h1 className="font-display font-black text-2xl mb-6">Entrar</h1>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              type="password"
              className="field"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
          <button
            onClick={entrar}
            disabled={cargando || !email || !pass}
            className="btn-primary w-full"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
          <p className="text-sm text-ink/60">
            <Link href="/recuperar" className="text-grass font-semibold">
              ¿Te olvidaste la contraseña?
            </Link>
          </p>
          <p className="text-sm text-ink/60">
            ¿Primera vez?{" "}
            <Link href="/registro" className="text-grass font-semibold">
              Creá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
