"use client";

import usePartner from "@/lib/swr/use-partner";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { useParams } from "next/navigation";

export function ProgramPartnerAboutPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return <PartnerAbout partner={partner} error={error} />;
}
