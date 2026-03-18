"use client";

interface DisplayProps {
  /** The secondary line: shows the running expression */
  expression: string;
  /** The primary large value */
  value: string;
}

/** Shrink the font when the number gets very long */
function valueFontSize(value: string): string {
  const len = value.replace("-", "").length;
  if (len <= 9) return "text-5xl";
  if (len <= 12) return "text-4xl";
  return "text-3xl";
}

export default function Display({ expression, value }: DisplayProps) {
  return (
    <div className="flex flex-col items-end justify-end px-6 pt-6 pb-4 min-h-[10rem] gap-1 overflow-hidden">
      {/* Expression / secondary line */}
      <p className="text-zinc-400 text-base h-6 truncate max-w-full text-right">
        {expression || "\u00A0"}
      </p>

      {/* Primary value */}
      <p
        className={[
          "display-value font-light tracking-tight text-right w-full truncate",
          valueFontSize(value),
        ].join(" ")}
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </p>
    </div>
  );
}
