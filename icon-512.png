"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Rol } from "@/lib/types";

export default function Registro() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("jugador");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const crear = async () => {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { nombre, rol } },
    });
    if (error) {
      setError(error.message);
      setCargando(false);
      return;
    }
    if (!data.session) {
      setAviso(
        "Te mandamos un mail para confirmar la cuenta. Confirmalo y volvé a entrar."
      );
      setCargando(false);
      return;
    }
    router.push(rol === "pf" ? "/pf" : "/unirse");
    router.refresh();
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display font-bold uppercase tracking-[0.25em] text-grass text-sm mb-2">
          Plantel
        </p>
        <h1 className="font-display font-black text-2xl mb-6">Crear cuenta</h1>
        <div className="space-y-4">
          <div>
            <span className="label">Soy</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRol("pf")}
                className={
                  rol === "pf"
                    ? "btn bg-ink text-white"
                    : "btn border border-ink/15"
                }
              >
                Preparador físico
              </button>
              <button
                type="button"
                onClick={() => setRol("jugador")}
                className={
                  rol === "jugador"
                    ? "btn bg-ink text-white"
                    : "btn border border-ink/15"
                }
              >
                Jugador
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nombre">Nombre y apellido</label>
            <input
              id="nombre"
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={rol === "pf" ? "Prof. Juan Pérez" : "Juan Pérez"}
            />
          </div>
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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          {error && <p className="text-sm text-rpe-max font-medium">{error}</p>}
          {aviso && <p className="text-sm text-grass font-medium">{aviso}</p>}
          <button
            onClick={crear}
            disabled={cargando || !nombre || !email || pass.length < 6}
            className="btn-primary w-full"
          >
            {cargando ? "Creando…" : "Crear cuenta"}
          </button>
          <p className="text-sm text-ink/60">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-grass font-semibold">
              Entrá
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
