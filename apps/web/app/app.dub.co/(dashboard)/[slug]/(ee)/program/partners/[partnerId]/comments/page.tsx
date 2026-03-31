"use client";

import { PartnerComments } from "@/ui/partners/partner-comments";
import { useParams } from "next/navigation";

export default function ProgramPartnerCommentsPage() {
  const { partnerId } = useParams() as { partnerId: string };

  return (
    <>
      <h2 className="text-content-emphasis text-lg font-semibold">Comments</h2>
      <PartnerComments partnerId={partnerId} />
    </>
  );
}
