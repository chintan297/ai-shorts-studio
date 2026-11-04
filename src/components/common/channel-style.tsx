import { Cpu, Lightbulb, Orbit, PawPrint, Shirt, ToyBrick, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Cpu, Shirt, Orbit, ToyBrick, Lightbulb, PawPrint };

/** Static class strings so Tailwind can see them. */
export const ACCENT: Record<string, { text: string; soft: string; bar: string; border: string }> = {
  cyan: { text: "text-cyan-600 dark:text-cyan-400", soft: "bg-cyan-500/10", bar: "bg-cyan-500", border: "border-cyan-500/40" },
  pink: { text: "text-pink-600 dark:text-pink-400", soft: "bg-pink-500/10", bar: "bg-pink-500", border: "border-pink-500/40" },
  violet: { text: "text-violet-600 dark:text-violet-400", soft: "bg-violet-500/10", bar: "bg-violet-500", border: "border-violet-500/40" },
  amber: { text: "text-amber-600 dark:text-amber-400", soft: "bg-amber-500/10", bar: "bg-amber-500", border: "border-amber-500/40" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", soft: "bg-emerald-500/10", bar: "bg-emerald-500", border: "border-emerald-500/40" },
  green: { text: "text-green-600 dark:text-green-400", soft: "bg-green-500/10", bar: "bg-green-500", border: "border-green-500/40" },
};

export function accentOf(accent: string) {
  return ACCENT[accent] ?? ACCENT.cyan!;
}

export function ChannelIcon({ icon, accent, size = "md", className }: { icon: string; accent: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = ICONS[icon] ?? Cpu;
  const a = accentOf(accent);
  const box = size === "lg" ? "size-12 rounded-xl" : size === "sm" ? "size-7 rounded-md" : "size-9 rounded-lg";
  const glyph = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", box, a.soft, a.text, className)}>
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

export function ProgressBar({ value, accent, className, label }: { value: number; accent?: string; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn("h-full rounded-full transition-all", accent ? accentOf(accent).bar : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}
