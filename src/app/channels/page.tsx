import type { Metadata } from "next";
import { ChannelsView } from "@/components/channels/channels-view";

export const metadata: Metadata = { title: "My Channels" };

export default function ChannelsPage() {
  return <ChannelsView />;
}
