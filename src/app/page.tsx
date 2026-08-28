import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();
    redirect(perfil?.rol === "pf" ? "/pf" : "/jugador");
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <div className="relative flex-1 flex flex-col justify-center px-6 py-16 overflow-hidden">
        <span
          aria-hidden
          className="absolute -right-6 top-4 font-display font-black text-[16rem] leading-none text-ink/5 select-none"
        >
          10
        </span>
        <div className="relative max-w-md">
          <p className="font-display font-700 uppercase tracking-[0.25em] text-tape text-sm mb-3">
            Plantel
          </p>
          <h1 className="font-display font-black text-4xl leading-tight mb-4">
            La sesión del día, la carga de todo el plantel.
          </h1>
          <p className="text-ink/70 mb-8">
            El preparador físico arma el entrenamiento con videos de referencia.
            Cada jugador lo ejecuta y reporta cómo le fue en menos de un minuto.
            Vos ves la carga y la evolución de todos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/registro" className="btn-primary">
              Crear cuenta
            </Link>
            <Link href="/login" className="btn-ghost">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
      <footer className="px-6 py-4 text-xs text-ink/40">
        Carga interna con RPE (Borg CR-10) y sRPE de Foster. Hecho para el
        fútbol y los deportes de equipo.
      </footer>
    </main>
  );
}
