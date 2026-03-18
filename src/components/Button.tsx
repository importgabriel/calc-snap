"use client";

export type ButtonVariant = "digit" | "operator" | "action" | "equals" | "zero";

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  /** Span 2 columns (used for the "0" key) */
  wide?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  digit:
    "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white",
  operator:
    "bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-white",
  action:
    "bg-zinc-500 hover:bg-zinc-400 active:bg-zinc-300 text-zinc-900 font-semibold",
  equals:
    "bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-white",
  zero:
    "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white",
};

export default function Button({
  label,
  onClick,
  variant = "digit",
  wide = false,
  disabled = false,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={[
        "btn-press",
        "flex items-center justify-center",
        "rounded-full",
        "text-2xl font-light",
        "select-none",
        "transition-colors duration-75",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        "h-16 w-full",
        wide ? "col-span-2 justify-start pl-6" : "",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        variantClasses[variant],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}
