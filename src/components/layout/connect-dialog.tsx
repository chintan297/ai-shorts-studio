"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEngine, useSync } from "@/hooks/use-sync";

export function ConnectWorkspaceDialog({ trigger }: { trigger?: React.ReactNode }) {
  const engine = useEngine();
  const pending = useSync((s) => s.pendingOps.length);
  const kind = useSync((s) => s.backendKind);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await engine.redeemPairingCode(code);
      if (result.status === "ok") {
        toast.success("Device connected. Your workspace progress is loading.");
        setOpen(false);
        setCode("");
      } else if (result.status === "rate_limited") {
        setError("Too many wrong attempts. Wait 15 minutes, then try again.");
      } else {
        setError(
          `That code is invalid, expired or already used.${
            result.remainingAttempts !== undefined ? ` ${result.remainingAttempts} attempt(s) left before a 15-minute lock.` : ""
          }`,
        );
      }
    } catch (err) {
      setError((err as Error).message || "Couldn't connect. Check your internet connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Link2 data-icon="inline-start" /> Connect Existing Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Connect existing workspace</DialogTitle>
            <DialogDescription>
              On a device that is already connected, open <strong>Settings → Generate pairing code</strong>, then
              enter the 8-character code here. Codes expire after 15 minutes and work once.
            </DialogDescription>
          </DialogHeader>
          {kind === "mock" ? (
            <Alert>
              <AlertDescription>Pairing needs Supabase. This app is running in local-only mode.</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="pairing-code">Pairing code</Label>
            <Input
              id="pairing-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              className="font-mono text-lg tracking-[0.3em]"
              required
            />
          </div>
          {pending > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                This device has {pending} change(s) that haven&apos;t synced yet. They belong to this device&apos;s current
                workspace and will be discarded when you connect to another workspace.
              </AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length < 8 || kind === "mock"}>
              {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              Connect device
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
