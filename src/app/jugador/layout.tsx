import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function JugadorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol === "pf") redirect("/pf");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-chalk/90 backdrop-blur border-b border-ink/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/jugador"
            className="font-display font-black tracking-wide"
          >
            PLANTEL
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/unirse" className="hover:text-grass">
              Unirme a un equipo
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
