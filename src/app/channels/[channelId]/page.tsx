import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChannelDetail } from "@/components/channels/channel-detail";
import { CHANNELS, getChannel } from "@/lib/content/catalog";

export function generateStaticParams() {
  return CHANNELS.map((c) => ({ channelId: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/channels/[channelId]">): Promise<Metadata> {
  const { channelId } = await params;
  return { title: getChannel(channelId)?.name ?? "Channel" };
}

export default async function ChannelPage({ params }: PageProps<"/channels/[channelId]">) {
  const { channelId } = await params;
  const channel = getChannel(channelId);
  if (!channel) notFound();
  return <ChannelDetail channelId={channel.id} />;
}
