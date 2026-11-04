"use client";

import { AlertTriangle, CheckCircle2, CloudOff, Loader2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useSync } from "@/hooks/use-sync";
import type { Indicator } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

const META: Record<Indicator, { label: string; icon: typeof CheckCircle2; className: string }> = {
  synced: { label: "Synced", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300" },
  syncing: { label: "Syncing", icon: Loader2, className: "text-sky-700 bg-sky-500/10 dark:text-sky-300" },
  pending: { label: "Pending Changes", icon: UploadCloud, className: "text-amber-800 bg-amber-500/15 dark:text-amber-300" },
  offline: { label: "Offline", icon: CloudOff, className: "text-zinc-700 bg-zinc-500/15 dark:text-zinc-300" },
  failed: { label: "Sync Failed", icon: AlertTriangle, className: "text-red-700 bg-red-500/10 dark:text-red-300" },
};

export function SyncStatus({ className }: { className?: string }) {
  const indicator = useSync((s) => s.indicator);
  const pending = useSync((s) => s.pendingOps.length);
  const kind = useSync((s) => s.backendKind);
  const meta = META[indicator];
  const Icon = meta.icon;
  return (
    <Link
      href="/settings#sync"
      data-testid="sync-status"
      data-state={indicator}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.className, className)}
      title={kind === "mock" ? "Local-only mode: changes stay on this device" : undefined}
    >
      <Icon className={cn("size-3.5", indicator === "syncing" && "animate-spin")} aria-hidden />
      <span>{meta.label}</span>
      {pending > 0 && indicator !== "pending" ? <span className="tabular-nums">· {pending}</span> : null}
      {pending > 0 && indicator === "pending" ? <span className="tabular-nums">({pending})</span> : null}
    </Link>
  );
}
