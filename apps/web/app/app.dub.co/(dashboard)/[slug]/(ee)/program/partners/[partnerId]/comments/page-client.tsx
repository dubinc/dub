"use client";

import { PartnerComments } from "@/ui/partners/partner-comments";
import { useParams } from "next/navigation";

export function ProgramPartnerCommentsPageClient() {
  const { partnerId } = useParams() as { partnerId: string };

  return <PartnerComments partnerId={partnerId} />;
}
