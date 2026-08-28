"use client";

import { useState } from "react";

// Grilla de fotos de un ejercicio, tocables para ampliar.
export default function FotosEjercicio({
  imagenes,
  nombre,
}: {
  imagenes: string[];
  nombre: string;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  if (imagenes.length === 0) return null;

  const grid =
    imagenes.length === 1
      ? ""
      : imagenes.length === 2
        ? "grid grid-cols-2 gap-2"
        : "grid grid-cols-3 gap-2";

  return (
    <>
      <div className={grid}>
        {imagenes.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setAmpliada(url)}
            className="block w-full"
            aria-label={`Ampliar foto ${i + 1} de ${nombre}`}
          >
            <img
              src={url}
              alt={`Referencia ${i + 1}: ${nombre}`}
              loading="lazy"
              className={
                (imagenes.length === 1 ? "max-h-64" : "h-32") +
                " w-full object-cover rounded-xl border border-ink/10"
              }
            />
          </button>
        ))}
      </div>

      {ampliada && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-label={`Foto de ${nombre}`}
        >
          <img
            src={ampliada}
            alt={`Referencia: ${nombre}`}
            className="max-h-[85vh] max-w-full rounded-2xl"
          />
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            aria-label="Cerrar"
            onClick={() => setAmpliada(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
