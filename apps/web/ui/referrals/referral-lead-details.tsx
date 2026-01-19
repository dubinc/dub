import { ReferralProps } from "@/lib/types";
import { Envelope, OfficeBuilding } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { ReferralStatusBadge } from "./referral-status-badge";
import { getCompanyLogoUrl } from "./referral-utils";

interface ReferralCustomerDetailsProps {
  referral: Pick<ReferralProps, "id" | "name" | "email" | "company" | "status">;
}

export function ReferralLeadDetails({
  referral,
}: ReferralCustomerDetailsProps) {
  const companyLogoUrl = getCompanyLogoUrl(referral.email);

  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="relative w-fit shrink-0">
          <img
            src={companyLogoUrl || `${OG_AVATAR_URL}${referral.id}`}
            alt={referral.company}
            className="size-10 rounded-full"
          />
        </div>

        <ReferralStatusBadge status={referral.status} />
      </div>

      <div className="mt-2">
        <div className="text-content-emphasis text-base font-semibold">
          {referral.name}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {[
          { icon: Envelope, value: referral.email },
          { icon: OfficeBuilding, value: referral.company },
        ].map(({ icon: Icon, value }, index) => (
          <div
            key={index}
            className="text-content-subtle flex items-center gap-1.5"
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="text-xs font-medium text-neutral-700">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
