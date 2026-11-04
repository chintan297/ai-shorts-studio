"use client";

import { CopyButton, CopyField } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VideoPackage } from "@/lib/content/schema";

export function SeoTab({ pkg }: { pkg: VideoPackage }) {
  const { seo } = pkg;
  const titleLength = [...seo.title].length;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Titles</CardTitle>
          <CardDescription>Primary title ({titleLength} characters) plus three truthful alternatives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <p className="min-w-0 flex-1 font-medium wrap-break-word">{seo.title}</p>
            <CopyButton text={seo.title} label="YouTube title" variant="default">
              Copy Title
            </CopyButton>
          </div>
          {seo.altTitles.map((t, i) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <Badge variant="outline">Alt {i + 1}</Badge>
              <p className="min-w-0 flex-1 wrap-break-word">{t}</p>
              <CopyButton text={t} label={`alternative title ${i + 1}`} size="icon-sm" variant="ghost" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <CopyField label="Description" value={seo.description} copyLabel="description" maxHeight="max-h-96" />
          <CopyField label={`Tags (${seo.tags.length})`} value={seo.tags.join(", ")} copyLabel="tags" hint="Paste into YouTube Studio → Show more → Tags." />
          <CopyField label="Hashtags" value={seo.hashtags.join(" ")} copyLabel="hashtags" hint="Already included at the end of the description." />
          {seo.pinnedComment ? (
            <CopyField label="Pinned comment" value={seo.pinnedComment} copyLabel="pinned comment" hint="Post it as a comment after publishing, then pin it." />
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Pinned comment: not applicable. YouTube disables comments on made-for-kids videos.
            </div>
          )}
          {seo.engagementQuestion ? <CopyField label="Engagement question" value={seo.engagementQuestion} copyLabel="engagement question" /> : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Keywords & playlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Primary:</span>
            {seo.primaryKeywords.map((k) => (
              <Badge key={k}>{k}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Secondary:</span>
            {seo.secondaryKeywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Playlist:</span>
            <span className="font-medium">{seo.playlist}</span>
            <CopyButton text={seo.playlist} label="playlist name" size="icon-sm" variant="ghost" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
