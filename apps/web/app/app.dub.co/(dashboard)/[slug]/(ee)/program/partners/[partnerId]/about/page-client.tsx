"use client";

import usePartner from "@/lib/swr/use-partner";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { PartnerApplicationDetails } from "@/ui/partners/partner-application-details";
import { useParams } from "next/navigation";

export function ProgramPartnerAboutPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return (
    <>
      <PartnerAbout partner={partner} error={error} />
      {partner?.applicationId && (
        <>
          <hr className="border-border-subtle" />
          <h3 className="text-content-emphasis text-lg font-semibold">
            Application
          </h3>
          <PartnerApplicationDetails applicationId={partner.applicationId} />
        </>
      )}
    </>
  );
}
