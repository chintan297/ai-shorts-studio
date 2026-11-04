"use client";

import { Download, KeyRound, Loader2, LogOut, RefreshCw, Smartphone, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CopyButton } from "@/components/common/copy-button";
import { ConnectWorkspaceDialog } from "@/components/layout/connect-dialog";
import { PageContainer, PageHeader } from "@/components/layout/app-shell";
import { SyncStatus } from "@/components/layout/sync-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSchedule, useSettings } from "@/hooks/use-progress";
import { useEngine, useSync } from "@/hooks/use-sync";
import { backupSchema, buildBackup, summarizeBackup, type WorkspaceBackup } from "@/lib/backup/schema";
import { CHANNELS } from "@/lib/content/catalog";
import { formatSlot, slotFor } from "@/lib/content/schedule";
import type { ChannelId } from "@/lib/content/schema";
import { REJECTION_MESSAGES } from "@/lib/progress/types";
import { SHARED_WORKSPACE } from "@/lib/sync";
import { actions, describeError } from "@/lib/sync/actions";

export function SettingsView() {
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Settings" description="Workspace, devices, sync, schedule and backups. There's no login: devices connect with one-time pairing codes." />
      <div className="space-y-4">
        <WorkspaceCard />
        {SHARED_WORKSPACE ? <SharedModeCard /> : <PairingCard />}
        <DevicesCard />
        <SyncCard />
        <ScheduleCard />
        <BackupCard />
        <ResetCard />
      </div>
    </PageContainer>
  );
}

function WorkspaceCard() {
  const engine = useEngine();
  const workspace = useSync((s) => s.workspace);
  const name = useSync((s) => s.progress.workspaceName);
  const device = useSync((s) => s.device);
  const kind = useSync((s) => s.backendKind);
  const settings = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>
          {kind === "supabase" ? "Private cloud workspace (Supabase). Progress syncs to every connected device." : "Local-only mode: progress stays in this browser."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InlineTextSetting
          key={`ws-${name}`}
          id="ws-name"
          label="Workspace name"
          initial={name}
          onSave={(value) => actions.updateSettings({ name: value }, "Workspace renamed")}
        />
        <InlineTextSetting
          key={`dev-${device?.label}`}
          id="device-label"
          label="This device’s name"
          initial={device?.label ?? ""}
          onSave={async (value) => {
            try {
              await engine.renameDevice(value);
              toast.success("Device renamed");
            } catch (err) {
              toast.error(describeError(err));
            }
          }}
        />
        <dl className="grid gap-1 text-sm sm:col-span-2 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Workspace ID</dt>
          <dd className="font-mono text-xs break-all">{workspace?.id ?? "—"}</dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{workspace ? new Date(workspace.created_at).toLocaleString("en-IN") : "—"}</dd>
          <dt className="text-muted-foreground">Content version</dt>
          <dd>{settings?.content_version ?? "v1"} (static library, never changed by syncing)</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Text input + Save button. Keyed by its saved value by the caller, so it resets when the synced value changes. */
function InlineTextSetting({ id, label, initial, onSave }: { id: string; label: string; initial: string; onSave: (value: string) => unknown }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} value={value} maxLength={80} onChange={(e) => setValue(e.target.value)} />
        <Button variant="outline" disabled={!value.trim() || value === initial} onClick={() => void onSave(value.trim())}>
          Save
        </Button>
      </div>
    </div>
  );
}

function SharedModeCard() {
  return (
    <Card id="pairing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Same data on every device
        </CardTitle>
        <CardDescription>
          This site uses one shared workspace. Open it on any phone or computer and the same, up-to-date progress appears, with no
          code or login. Anyone who has the site address can see and change this progress, so keep the address to yourself.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function PairingCard() {
  const engine = useEngine();
  const kind = useSync((s) => s.backendKind);
  const online = useSync((s) => s.online);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [code]);
  const remaining = code ? Math.max(0, Math.floor((Date.parse(code.expiresAt) - now) / 1000)) : 0;
  const expired = Boolean(code) && remaining === 0;

  async function generate() {
    setBusy(true);
    try {
      const created = await engine.createPairingCode();
      setNow(Date.now());
      setCode(created);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="pairing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Connect another device
        </CardTitle>
        <CardDescription>
          Generate a one-time code here and enter it on the new device under “Connect Existing Workspace”. Codes are random, expire
          after 15 minutes, work only once, and are stored only as a secure hash. Generating a new code cancels the previous one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {code && !expired ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center">
            <p className="font-mono text-3xl font-semibold tracking-[0.25em]" data-testid="pairing-code">
              {code.code}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton text={code.code} label="pairing code">
                Copy Code
              </CopyButton>
              <span className="text-sm text-muted-foreground tabular-nums">
                Expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        ) : null}
        {expired ? <p className="text-sm text-muted-foreground">That code expired. Generate a new one.</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void generate()} disabled={busy || kind === "mock" || !online} data-testid="generate-pairing-code">
            {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
            {code ? "Generate New Pairing Code" : "Generate Pairing Code"}
          </Button>
          <ConnectWorkspaceDialog />
        </div>
        {kind === "mock" ? <p className="text-xs text-muted-foreground">Pairing needs Supabase, so it’s disabled in local-only mode.</p> : null}
        {!online ? <p className="text-xs text-muted-foreground">You’re offline. Pairing needs an internet connection.</p> : null}
      </CardContent>
    </Card>
  );
}

function DevicesCard() {
  const engine = useEngine();
  const members = useSync((s) => s.members);
  const memberId = useSync((s) => s.memberId);
  const active = members.filter((m) => !m.revoked_at);
  const revoked = members.filter((m) => m.revoked_at).slice(-5);
  return (
    <Card id="devices">
      <CardHeader>
        <CardTitle>Connected devices</CardTitle>
        <CardDescription>A removed device immediately loses access. The server enforces this through row-level security, not just this screen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" data-testid={`device-${m.id}`}>
            <div className="flex min-w-0 items-center gap-3">
              <Smartphone className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.device_label} {m.id === memberId ? <Badge variant="secondary">This device</Badge> : null} {m.role === "owner" ? <Badge variant="outline">Created workspace</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected {new Date(m.created_at).toLocaleDateString("en-IN")} · last active {new Date(m.last_active_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            {SHARED_WORKSPACE ? null : m.id === memberId ? (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost">
                    <LogOut data-icon="inline-start" /> Disconnect this device
                  </Button>
                }
                title="Disconnect this device?"
                description="This device loses access to the workspace. Your progress stays safe in the cloud. To reconnect, use a pairing code from another device."
                confirmLabel="Disconnect"
                destructive
                onConfirm={async () => {
                  try {
                    await engine.revokeDevice(m.id);
                  } catch (err) {
                    toast.error(describeError(err));
                  }
                }}
              />
            ) : (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" className="text-destructive" data-testid={`remove-device-${m.id}`}>
                    <Trash2 data-icon="inline-start" /> Remove
                  </Button>
                }
                title={`Remove “${m.device_label}”?`}
                description="That device immediately loses access to this workspace and its progress. It can only reconnect with a new pairing code."
                confirmLabel="Remove device"
                destructive
                onConfirm={async () => {
                  try {
                    await engine.revokeDevice(m.id);
                    toast.success("Device removed");
                  } catch (err) {
                    toast.error(describeError(err));
                  }
                }}
              />
            )}
          </div>
        ))}
        {revoked.length ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Recently removed ({revoked.length})</summary>
            <ul className="mt-2 space-y-1">
              {revoked.map((m) => (
                <li key={m.id}>
                  {m.device_label}, removed {new Date(m.revoked_at!).toLocaleString("en-IN")}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SyncCard() {
  const engine = useEngine();
  const pending = useSync((s) => s.pendingOps.length);
  const rejected = useSync((s) => s.rejected);
  const realtime = useSync((s) => s.realtime);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const [busy, setBusy] = useState(false);
  return (
    <Card id="sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Synchronization <SyncStatus />
        </CardTitle>
        <CardDescription>
          Changes are saved on this device first and sent to the cloud in order. “Synced” only appears after the cloud confirms.
          Offline changes wait here and are retried automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-1 sm:grid-cols-[180px_1fr]">
          <dt className="text-muted-foreground">Pending changes</dt>
          <dd data-testid="pending-count">{pending}</dd>
          <dt className="text-muted-foreground">Live updates</dt>
          <dd>{realtime === "subscribed" ? "Connected" : realtime === "connecting" ? "Connecting…" : "Reconnecting…"}</dd>
          <dt className="text-muted-foreground">Last confirmed sync</dt>
          <dd>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("en-IN") : "Not yet"}</dd>
        </dl>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await engine.retryNow().catch(() => undefined);
            setBusy(false);
          }}
        >
          <RefreshCw data-icon="inline-start" className={busy ? "animate-spin" : undefined} /> Sync now
        </Button>
        {rejected.length ? (
          <Alert variant="destructive">
            <AlertTitle>Changes the server refused ({rejected.length})</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-2">
                {rejected.map((r) => (
                  <li key={r.op.op_id} className="flex items-start justify-between gap-2">
                    <span>
                      <strong>{r.op.type.replaceAll("_", " ")}</strong>
                      {r.op.video_id ? ` · ${r.op.video_id}` : r.op.day_number ? ` · day ${r.op.day_number}` : ""} —{" "}
                      {REJECTION_MESSAGES[r.reason] ?? r.reason}
                    </span>
                    <Button size="xs" variant="ghost" onClick={() => void engine.dismissRejected(r.op.op_id)} aria-label="Dismiss">
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScheduleCard() {
  const { start, preferences } = useSchedule();
  const savedSlots = Object.fromEntries(CHANNELS.map((c) => [c.id, [slotFor(c, 1, preferences), slotFor(c, 2, preferences)] as [string, string]]));
  // Remount the form when the synced values change (another device may edit them).
  return <ScheduleForm key={`${start}|${JSON.stringify(savedSlots)}`} start={start} savedSlots={savedSlots} />;
}

function ScheduleForm({ start, savedSlots }: { start: string; savedSlots: Record<string, [string, string]> }) {
  const settings = useSettings();
  const [startDate, setStartDate] = useState(start);
  const [slots, setSlots] = useState<Record<string, [string, string]>>(savedSlots);

  return (
    <Card id="schedule">
      <CardHeader>
        <CardTitle>Publishing schedule</CardTitle>
        <CardDescription>Planned dates are Day 1 = start date. Times are in {settings?.timezone ?? "Asia/Kolkata"} (IST).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="start-date">Plan start date (Day 1)</Label>
            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <Button variant="outline" disabled={!startDate || startDate === start} onClick={() => void actions.updateSettings({ schedule_start_date: startDate }, "Start date saved")}>
            Save start date
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Upload time slots per channel</p>
          {CHANNELS.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
              <span className="truncate">{c.shortName}</span>
              {[0, 1].map((i) => (
                <Input
                  key={i}
                  type="time"
                  aria-label={`${c.shortName} video ${i + 1} time`}
                  className="w-28"
                  value={slots[c.id]?.[i] ?? ""}
                  onChange={(e) =>
                    setSlots((s) => {
                      const cur = [...(s[c.id] ?? ["", ""])] as [string, string];
                      cur[i] = e.target.value;
                      return { ...s, [c.id]: cur };
                    })
                  }
                />
              ))}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const valid = Object.fromEntries(Object.entries(slots).filter(([, v]) => v.every((t) => /^\d{2}:\d{2}$/.test(t)))) as Partial<Record<ChannelId, [string, string]>>;
              void actions.updateSettings({ preferences: { slots: valid } }, "Time slots saved");
            }}
          >
            Save time slots
          </Button>
          <p className="text-xs text-muted-foreground">
            Defaults: {CHANNELS.map((c) => `${c.shortName} ${formatSlot(c.defaultSlots[0])} / ${formatSlot(c.defaultSlots[1])}`).join(" · ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BackupCard() {
  const engine = useEngine();
  const online = useSync((s) => s.online);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<WorkspaceBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    try {
      const data = buildBackup(await engine.collectBackupData());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shorts-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setError(null);
    setBackup(null);
    try {
      const json = JSON.parse(await file.text());
      if (json?.backupVersion !== undefined && json.backupVersion !== 1) {
        setError(`Unsupported backup version ${json.backupVersion}. This app reads version 1.`);
        return;
      }
      const parsed = backupSchema.safeParse(json);
      if (!parsed.success) {
        setError(`This file isn't a valid workspace backup: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        return;
      }
      setBackup(parsed.data);
    } catch {
      setError("Couldn't read that file as JSON.");
    }
  }

  const summary = backup ? summarizeBackup(backup) : null;
  return (
    <Card id="backup">
      <CardHeader>
        <CardTitle>Backup & restore</CardTitle>
        <CardDescription>
          The export holds progress, statuses, skipped days and videos, upload details, prompt testing, history and preferences. It
          never includes login tokens or pairing secrets. Static content isn’t included because it’s built into the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportBackup()} disabled={busy || !online}>
            <Download data-icon="inline-start" /> Export Workspace Backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload data-icon="inline-start" /> Import Workspace Backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="backup-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {summary && backup ? (
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p className="font-medium">Import summary</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              <li>Exported: {new Date(summary.exportedAt).toLocaleString("en-IN")}</li>
              <li>Workspace: {backup.workspaceName}</li>
              <li>Video records: {summary.videos}</li>
              <li>Uploaded: {summary.uploaded}</li>
              <li>Skipped videos: {summary.skippedVideos}</li>
              <li>Skipped days: {summary.skippedDays}</li>
              <li>Prompt testing records: {summary.prompts}</li>
              <li>History entries: {summary.activity}</li>
            </ul>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "merge" | "replace")} className="gap-2">
              <label className="flex items-start gap-2">
                <RadioGroupItem value="merge" className="mt-0.5" />
                <span>
                  <strong>Merge</strong>: keeps the current progress and adds or updates records where the backup is newer.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <RadioGroupItem value="replace" className="mt-0.5" />
                <span>
                  <strong>Replace</strong>: deletes the current progress and restores exactly what’s in the backup.
                </span>
              </label>
            </RadioGroup>
            <div className="flex gap-2">
              <ConfirmDialog
                trigger={<Button disabled={busy || !online}>Import ({mode})</Button>}
                title={`Import backup (${mode})?`}
                description={
                  mode === "replace"
                    ? "Current progress in this workspace will be replaced on every connected device. Pending changes are synced first."
                    : "Records from the backup that are newer than the current ones will be applied on every connected device."
                }
                confirmLabel="Import"
                destructive={mode === "replace"}
                onConfirm={async () => {
                  setBusy(true);
                  try {
                    const result = await engine.importBackup(backup, mode);
                    toast.success(`Imported: ${result.videos} videos, ${result.days} days, ${result.prompts} prompts, ${result.activity} history entries`);
                    setBackup(null);
                  } catch (err) {
                    toast.error(describeError(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button variant="ghost" onClick={() => setBackup(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ResetCard() {
  const engine = useEngine();
  const online = useSync((s) => s.online);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Reset progress</CardTitle>
        <CardDescription>
          Deletes all progress (statuses, checklists, uploads, skips and prompt testing) for every connected device. The 90-day content library is never deleted. Export a
          backup first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Type RESET to confirm</Label>
          <Input id="reset-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-40 font-mono" autoComplete="off" />
        </div>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" disabled={confirm !== "RESET" || busy || !online}>
              Reset all progress
            </Button>
          }
          title="Really reset all progress?"
          description="This can't be undone unless you have a backup."
          confirmLabel="Reset progress"
          destructive
          onConfirm={async () => {
            setBusy(true);
            try {
              await engine.resetProgress();
              setConfirm("");
              toast.success("Progress reset. The content library is unchanged.");
            } catch (err) {
              toast.error(describeError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
