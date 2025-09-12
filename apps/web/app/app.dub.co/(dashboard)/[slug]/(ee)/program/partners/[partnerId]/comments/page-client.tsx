"use client";

import { usePartnerComments } from "@/lib/swr/use-partner-comments";
import { useParams } from "next/navigation";

export function ProgramPartnerCommentsPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { comments } = usePartnerComments({ partnerId });

  return <div>WIP {JSON.stringify(comments)}</div>;
}
