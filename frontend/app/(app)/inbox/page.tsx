import type { Metadata } from "next";
import { InboxView } from "@/features/legacy/directory";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return <InboxView />;
}
