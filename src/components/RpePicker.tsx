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
    "font-display font-black text-lg rounded-xl h-12 transition-all duration-150 active:scale-90 border ";
  if (!activo) return base + "border-ink/15 bg-ink/5 text-ink/50 hover:bg-ink/10";
  const shadow = "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]";
  if (n <= 3) return base + "border-transparent bg-rpe-low text-chalk " + shadow;
  if (n <= 6) return base + "border-transparent bg-rpe-mid text-chalk " + shadow;
  if (n <= 8) return base + "border-transparent bg-rpe-high text-chalk " + shadow;
  return base + "border-transparent bg-rpe-max text-chalk " + shadow;
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
