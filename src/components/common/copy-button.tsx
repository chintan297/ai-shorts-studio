"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function writeClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts (e.g. testing over a LAN IP).
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  if (!ok) throw new Error("copy_failed");
}

export function CopyButton({
  text,
  label,
  className,
  variant = "outline",
  size = "sm",
  children,
}: {
  text: string;
  label: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "xs" | "icon-sm";
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await writeClipboard(text);
          setCopied(true);
          toast.success(`Copied ${label}`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Your browser blocked clipboard access.");
        }
      }}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {size === "icon-sm" ? null : (children ?? "Copy")}
    </Button>
  );
}

/** A labelled, read-only block of text with its own copy button. */
export function CopyField({
  label,
  value,
  copyLabel,
  mono = false,
  maxHeight = "max-h-80",
  hint,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  mono?: boolean;
  maxHeight?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <CopyButton text={value} label={copyLabel ?? label} />
      </div>
      <div
        className={cn(
          "overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap",
          mono && "font-mono text-[13px]",
          maxHeight,
        )}
      >
        {value}
      </div>
    </div>
  );
}
