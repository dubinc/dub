import { EnrolledPartnerProps } from "@/lib/types";
import { CopyButton, StatusBadge, Tooltip } from "@dub/ui";
import { COUNTRIES, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { PropsWithChildren } from "react";
import { PartnerStatusBadges } from "./partner-status-badges";

export function PartnerInfoSection({
  partner,
  children,
}: PropsWithChildren<{
  partner: EnrolledPartnerProps;
}>) {
  const badge = PartnerStatusBadges[partner.status];

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="relative w-fit">
          <img
            src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
            alt={partner.name}
            className="size-12 rounded-full"
          />
          {partner.country && (
            <Tooltip content={COUNTRIES[partner.country]}>
              <div className="absolute -right-1 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                <img
                  alt=""
                  src={`https://flag.vercel.app/m/${partner.country}.svg`}
                  className="size-3 rounded-full"
                />
              </div>
            </Tooltip>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2">
          <span className="text-lg font-semibold leading-tight text-neutral-900">
            {partner.name}
          </span>
          {badge && (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          )}
        </div>
        {partner.email && (
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-sm text-neutral-500">{partner.email}</span>
            <CopyButton
              value={partner.email}
              variant="neutral"
              className="p-1 [&>*]:h-3 [&>*]:w-3"
              successMessage="Copied email to clipboard!"
            />
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
