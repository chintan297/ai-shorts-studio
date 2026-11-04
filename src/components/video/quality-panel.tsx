"use client";

import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { ProgressBar } from "@/components/common/channel-style";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { qualitySectionKeys, type QualityReport } from "@/lib/content/schema";
import { SECTION_LABELS } from "@/lib/quality/score";

export function QualityPanel({ report, edited }: { report: QualityReport; edited: boolean }) {
  const failed = report.checks.filter((c) => !c.passed);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Quality score
          <span className="text-2xl font-semibold tabular-nums" data-testid="quality-score">
            {report.score}
          </span>
          <span className="text-sm font-normal text-muted-foreground">/ 100</span>
          {report.approved ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Passed all mandatory checks</Badge>
          ) : (
            <Badge variant="destructive">Not approved: mandatory checks failed</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automated checks of the prepared package{edited ? ", re-scored with your custom prompt edits" : ""}. It can’t judge the
          generated video itself; review that yourself before uploading.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {qualitySectionKeys.map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{SECTION_LABELS[key]}</span>
                <span className="tabular-nums text-muted-foreground">{report.sections[key]}/10</span>
              </div>
              <ProgressBar value={report.sections[key] * 10} label={SECTION_LABELS[key]} />
            </div>
          ))}
        </div>
        {failed.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" /> No missing requirements.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Missing requirements & suggestions</p>
            <ul className="space-y-1.5 text-sm">
              {failed.map((c) => (
                <li key={c.id} className="flex gap-2">
                  {c.mandatory ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                  <span>
                    {c.label}
                    {c.suggestion ? <span className="text-muted-foreground"> — {c.suggestion}</span> : null}
                    {c.mandatory ? <span className="text-destructive"> (mandatory)</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
