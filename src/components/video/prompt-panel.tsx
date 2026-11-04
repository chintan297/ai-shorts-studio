"use client";

import { Pencil, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CopyButton, CopyField } from "@/components/common/copy-button";
import { TestingBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VideoIndexEntry } from "@/lib/content/schema";
import { TESTING_STATUSES, type PromptProgressRow, type PromptType, type TestingStatus } from "@/lib/progress/types";
import { actions } from "@/lib/sync/actions";
import { TESTING_LABEL } from "@/components/common/status-badge";

/** Shows a ready-to-copy prompt plus its testing/approval workflow and an optional custom version. */
export function PromptPanel({
  entry,
  promptType,
  title,
  copyLabel,
  originalText,
  negativePrompt,
  progress,
  templateVersion,
  children,
}: {
  entry: VideoIndexEntry;
  promptType: PromptType;
  title: string;
  copyLabel: string;
  /** Full text copied by the main button when no custom version exists. */
  originalText: string;
  negativePrompt?: string;
  progress: PromptProgressRow | undefined;
  templateVersion: string;
  children?: React.ReactNode;
}) {
  const custom = progress?.custom_text ?? null;
  const effective = custom ?? originalText;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {title}
            {custom ? <Badge variant="secondary">Custom v{progress?.custom_version}</Badge> : <Badge variant="outline">Template {templateVersion}</Badge>}
            <TestingBadge status={progress?.testing_status ?? "untested"} />
          </CardTitle>
          <CardDescription>
            {custom
              ? "You're using your edited version. The original template is kept and can be restored."
              : "Ready to copy, with nothing to write yourself."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <CopyButton text={effective} label={copyLabel} variant="default" size="default">
              Copy {copyLabel}
            </CopyButton>
            <EditPromptDialog entry={entry} promptType={promptType} initial={effective} />
            {custom ? (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost">
                    <RotateCcw data-icon="inline-start" /> Reset to original
                  </Button>
                }
                title="Reset to the original prompt?"
                description="Your custom version is removed from use. The change is recorded in History."
                confirmLabel="Reset"
                onConfirm={() => actions.updatePrompt(entry, promptType, { custom_text: null }, "Original prompt restored")}
              />
            ) : null}
          </div>
          <CopyField label={custom ? "Your custom prompt" : "Prompt"} value={effective} copyLabel={copyLabel} maxHeight="max-h-[28rem]" />
          {negativePrompt && !custom ? <CopyField label="Negative prompt (also included above)" value={negativePrompt} copyLabel="negative prompt" maxHeight="max-h-40" /> : null}
        </CardContent>
      </Card>
      {children}
      {/* Keyed so the form resets whenever the synced record changes (e.g. from another device). */}
      <TestingCard key={progress?.version ?? 0} entry={entry} promptType={promptType} progress={progress} templateVersion={templateVersion} />
    </div>
  );
}

function EditPromptDialog({ entry, promptType, initial }: { entry: VideoIndexEntry; promptType: PromptType; initial: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setText(initial);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil data-icon="inline-start" /> Edit / save new version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit prompt</DialogTitle>
          <DialogDescription>
            Saves a new custom version for this video only. The original template is never overwritten. An approved prompt
            goes back to “Testing” when edited.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} className="font-mono text-xs" maxLength={12000} />
        <DialogFooter>
          <Button
            onClick={async () => {
              const ok = await actions.updatePrompt(entry, promptType, { custom_text: text }, "New prompt version saved");
              if (ok) setOpen(false);
            }}
            disabled={!text.trim() || text === initial}
          >
            <Save data-icon="inline-start" /> Save version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestingCard({
  entry,
  promptType,
  progress,
  templateVersion,
}: {
  entry: VideoIndexEntry;
  promptType: PromptType;
  progress: PromptProgressRow | undefined;
  templateVersion: string;
}) {
  const [status, setStatus] = useState<TestingStatus>(progress?.testing_status ?? "untested");
  const [feedback, setFeedback] = useState(progress?.feedback ?? "");
  const [failure, setFailure] = useState(progress?.failure_reason ?? "");

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Prompt testing</CardTitle>
        <CardDescription>
          Record how this prompt performed in the external tool.
          {progress?.approved_version ? ` Approved version: ${progress.approved_version}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <Label>Testing status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TestingStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TESTING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TESTING_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`fb-${promptType}`}>Feedback / improvement notes</Label>
            <Textarea id={`fb-${promptType}`} value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} maxLength={2000} />
          </div>
        </div>
        {status === "failed" ? (
          <div className="space-y-1.5">
            <Label htmlFor={`fail-${promptType}`}>What went wrong?</Label>
            <Textarea
              id={`fail-${promptType}`}
              value={failure}
              onChange={(e) => setFailure(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="e.g. extra fingers at 4 s, wrong accent, music too loud"
            />
          </div>
        ) : null}
        <Button
          size="sm"
          onClick={() =>
            void actions.updatePrompt(entry, promptType, {
              testing_status: status,
              feedback: feedback || null,
              failure_reason: status === "failed" ? failure || null : (progress?.failure_reason ?? null),
              template_version: templateVersion,
            })
          }
        >
          <Save data-icon="inline-start" /> Save testing result
        </Button>
      </CardContent>
    </Card>
  );
}
