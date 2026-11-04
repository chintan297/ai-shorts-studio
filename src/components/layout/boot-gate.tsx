"use client";

import { Info, Loader2, RefreshCw, ShieldOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEngine, useSync } from "@/hooks/use-sync";
import { SHARED_WORKSPACE } from "@/lib/sync";
import { ConnectWorkspaceDialog } from "./connect-dialog";

const BANNER_KEY = "ass.connect-banner-dismissed";

function readBannerDismissed() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export function BootGate({ children }: { children: React.ReactNode }) {
  const engine = useEngine();
  const phase = useSync((s) => s.phase);
  const error = useSync((s) => s.error);
  const createdHere = useSync((s) => s.createdHere);
  const kind = useSync((s) => s.backendKind);
  const [bannerDismissed, setBannerDismissed] = useState(readBannerDismissed);

  useEffect(() => {
    void engine.start();
  }, [engine]);

  if (phase === "revoked") return <RevokedScreen />;
  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg p-4 pt-16 sm:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Can&apos;t reach your workspace</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void engine.retryNow()}>
              <RefreshCw data-icon="inline-start" /> Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {kind === "mock" ? (
        <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-900 dark:text-amber-200">
          Local-only mode: Supabase isn&apos;t configured, so progress stays in this browser. Pairing and cloud sync are
          disabled. See the README to connect Supabase.
        </div>
      ) : null}
      {createdHere && !bannerDismissed && kind === "supabase" && !SHARED_WORKSPACE ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <Alert>
            <Info />
            <AlertTitle>A new private workspace was created on this device</AlertTitle>
            <AlertDescription>
              <p>Already using this app on another device? Connect to that workspace instead, so your progress syncs.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ConnectWorkspaceDialog />
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBannerDismissed(true);
                    try {
                      localStorage.setItem(BANNER_KEY, "1");
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <X data-icon="inline-start" /> Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {phase === "booting" ? (
        <div className="flex items-center gap-2 px-4 pt-4 text-sm text-muted-foreground sm:px-6" data-testid="booting">
          <Loader2 className="size-4 animate-spin" /> Loading your workspace…
        </div>
      ) : null}
      {children}
    </>
  );
}

function RevokedScreen() {
  const engine = useEngine();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-lg p-4 pt-16 sm:p-8" data-testid="revoked-screen">
      <Card>
        <CardHeader>
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <ShieldOff className="size-5" />
          </div>
          <CardTitle>This device was disconnected</CardTitle>
          <CardDescription>
            This device was removed from its workspace, so it can no longer read or change that workspace&apos;s
            progress. Connect again with a new pairing code from a connected device, or start a separate workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ConnectWorkspaceDialog trigger={<Button>Connect with a pairing code</Button>} />
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await engine.startNewWorkspace();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Start a new workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
