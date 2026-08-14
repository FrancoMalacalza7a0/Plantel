"use client";

const ETIQUETAS: Record<number, string> = {
  0: "Reposo",
  1: "Muy, muy fácil",
  2: "Fácil",
  3: "Moderado",
  4: "Algo duro",
  5: "Duro",
  6: "Duro +",
  7: "Muy duro",
  8: "Muy duro +",
  9: "Casi máximo",
  10: "Máximo",
};

function claseRpe(n: number, activo: boolean): string {
  const base =
    "font-display font-black text-lg rounded-xl h-12 transition-colors border ";
  if (!activo) return base + "border-ink/15 bg-white text-ink/60 hover:bg-ink/5";
  if (n <= 3) return base + "border-transparent bg-rpe-low text-white";
  if (n <= 6) return base + "border-transparent bg-rpe-mid text-white";
  if (n <= 8) return base + "border-transparent bg-rpe-high text-white";
  return base + "border-transparent bg-rpe-max text-white";
}

export default function RpePicker({
  valor,
  onChange,
}: {
  valor: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={claseRpe(n, valor === n)}
            aria-pressed={valor === n}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink/60 mt-2 min-h-5">
        {valor !== null ? ETIQUETAS[valor] : "¿Qué tan duro fue el entrenamiento?"}
      </p>
    </div>
  );
}
