export type Rol = "pf" | "jugador";

export type Bloque = "calentamiento" | "fuerza" | "campo" | "prevencion" | "otro";

export const BLOQUES: { valor: Bloque; label: string }[] = [
  { valor: "calentamiento", label: "Entrada en calor" },
  { valor: "fuerza", label: "Fuerza" },
  { valor: "campo", label: "Campo" },
  { valor: "prevencion", label: "Prevención" },
  { valor: "otro", label: "Otro" },
];

export interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  video_url: string | null;
  categoria: Bloque;
}

export interface Equipo {
  id: string;
  nombre: string;
  deporte: string;
  codigo_invitacion: string;
}

export interface Sesion {
  id: string;
  equipo_id: string;
  fecha: string;
  titulo: string;
  notas: string | null;
}
