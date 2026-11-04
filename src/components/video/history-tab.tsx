"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityList } from "@/components/common/activity-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEngine, useSync } from "@/hooks/use-sync";
import type { ActivityRow } from "@/lib/progress/types";

export function HistoryTab({ videoId, dayNumber, channelId }: { videoId: string; dayNumber: number; channelId: string }) {
  const engine = useEngine();
  const live = useSync((s) => s.activity);
  const pendingAll = useSync((s) => s.pendingOps);
  const ready = useSync((s) => s.phase === "ready");
  const [fetched, setFetched] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    engine
      .fetchActivity({ videoId, limit: 100 })
      .then((rows) => !cancelled && setFetched(rows))
      .catch(() => !cancelled && setError("Showing cached history; the full history loads when you're online."));
    return () => {
      cancelled = true;
    };
  }, [engine, videoId, ready]);

  const rows = useMemo(() => {
    const isMine = (a: ActivityRow) => a.video_id === videoId || (a.channel_id === channelId && a.day_number === dayNumber && !a.video_id);
    const map = new Map<string, ActivityRow>();
    for (const a of [...live.filter(isMine), ...fetched]) map.set(a.id, a);
    return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [live, fetched, videoId, channelId, dayNumber]);
  const pending = pendingAll.filter((op) => op.video_id === videoId || op.videos?.some((v) => v.video_id === videoId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Every change to this video, from every connected device. {error}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActivityList rows={rows} pending={pending} empty="Nothing has happened to this video yet." />
      </CardContent>
    </Card>
  );
}
