"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setCargando(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    });
    setEnviado(true);
    setCargando(false);
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-display font-bold uppercase tracking-[0.25em] text-tape text-sm mb-2">
          Plantel
        </p>
        <h1 className="font-display font-black text-2xl mb-2">
          Recuperar contraseña
        </h1>
        {enviado ? (
          <div className="card space-y-4">
            <p className="text-ink/70">
              Si ese mail está registrado, te enviamos un link para crear una
              contraseña nueva. Revisá también la carpeta de spam.
            </p>
            <p className="text-sm text-ink/50">
              Abrí el link en este mismo navegador para que funcione.
            </p>
            <Link href="/login" className="btn-ghost">
              Volver a entrar
            </Link>
          </div>
        ) : (
          <div className="card space-y-4">
            <p className="text-ink/60">
              Poné tu email y te mandamos un link para crear una nueva.
            </p>
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
            <button
              onClick={enviar}
              disabled={cargando || !email.includes("@")}
              className="btn-primary w-full"
            >
              {cargando ? "Enviando…" : "Enviarme el link"}
            </button>
            <p className="text-sm text-ink/60">
              <Link href="/login" className="text-mint font-semibold">
                ← Volver a entrar
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
