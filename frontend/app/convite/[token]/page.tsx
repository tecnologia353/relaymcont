import type { Metadata } from "next";
import { InviteAcceptView } from "@/features/session/invite-accept-view";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
}
