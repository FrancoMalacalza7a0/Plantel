import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NavLink from "@/components/NavLink";

export default async function PfLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "pf") redirect("/jugador");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-chalk/90 backdrop-blur border-b-2 border-tape">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/pf" className="font-display font-black tracking-wide text-tape">
            PLANTEL
          </Link>
          <nav className="flex items-center gap-1.5">
            <NavLink href="/pf" match={["/pf/equipos"]}>
              Equipos
            </NavLink>
            <NavLink href="/pf/ejercicios">Ejercicios</NavLink>
            <span className="ml-2">
              <SignOutButton />
            </span>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
