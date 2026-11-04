"use client";

import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { VideoIndexEntry } from "@/lib/content/schema";
import type { LockState } from "@/lib/progress/sequence";
import { CHECKLIST_ITEMS, type VideoProgressRow } from "@/lib/progress/types";
import { actions } from "@/lib/sync/actions";
import { ProductionBadge } from "@/components/common/status-badge";

export function ChecklistCard({ entry, row, lock }: { entry: VideoIndexEntry; row: VideoProgressRow | undefined; lock: LockState | undefined }) {
  const disabled = lock === "locked" || row?.upload_status === "skipped";
  const done = CHECKLIST_ITEMS.filter((i) => row?.checklist[i.key]).length;
  const production = row?.production_status ?? "pending";
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Production checklist
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {done}/{CHECKLIST_ITEMS.length}
          </span>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Status: <ProductionBadge status={production} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {disabled ? (
          <p className="mb-2 text-xs text-muted-foreground">
            {lock === "locked" ? "Locked until the earlier videos are uploaded or skipped." : "Restore this video to edit its checklist."}
          </p>
        ) : null}
        {CHECKLIST_ITEMS.map((item) => {
          const checked = Boolean(row?.checklist[item.key]);
          const id = `chk-${entry.id}-${item.key}`;
          return (
            <label key={item.key} htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60 has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                data-testid={`checklist-${item.key}`}
                onCheckedChange={(value) => void actions.setChecklist(entry, item.key, value === true)}
              />
              <span className={checked ? "text-muted-foreground line-through" : undefined}>{item.label}</span>
            </label>
          );
        })}
        <div className="flex flex-wrap gap-2 pt-2">
          {production === "pending" && !disabled ? (
            <Button size="sm" variant="secondary" onClick={() => void actions.startVideo(entry)}>
              <PlayCircle data-icon="inline-start" /> Start working
            </Button>
          ) : null}
          {production === "failed" ? (
            <Button size="sm" variant="outline" onClick={() => void actions.clearProductionFailed(entry)}>
              Clear failed status
            </Button>
          ) : null}
          {!disabled && production !== "failed" && production !== "completed" && production !== "pending" ? (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void actions.markProductionFailed(entry)}>
              Mark production failed
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
