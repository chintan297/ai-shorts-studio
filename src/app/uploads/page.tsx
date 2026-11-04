import type { Metadata } from "next";
import { UploadManager } from "@/components/uploads/upload-manager";

export const metadata: Metadata = { title: "Upload Manager" };

export default function UploadsPage() {
  return <UploadManager />;
}
