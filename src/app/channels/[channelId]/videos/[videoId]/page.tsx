import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoWorkspace } from "@/components/video/video-workspace";
import { allVideoParams, getPackage } from "@/lib/content/loader";

export function generateStaticParams() {
  return allVideoParams();
}

export async function generateMetadata({ params }: PageProps<"/channels/[channelId]/videos/[videoId]">): Promise<Metadata> {
  const { channelId, videoId } = await params;
  const pkg = getPackage(channelId, videoId);
  return { title: pkg ? `Day ${pkg.dayNumber} V${pkg.videoNumber} · ${pkg.seo.title}` : "Video" };
}

export default async function VideoPage({ params }: PageProps<"/channels/[channelId]/videos/[videoId]">) {
  const { channelId, videoId } = await params;
  const pkg = getPackage(channelId, videoId);
  if (!pkg) notFound();
  return <VideoWorkspace pkg={pkg} />;
}
