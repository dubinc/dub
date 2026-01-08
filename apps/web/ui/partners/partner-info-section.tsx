import { EnrolledPartnerProps } from "@/lib/types";
import { CopyButton, Tooltip } from "@dub/ui";
import { COUNTRIES, OG_AVATAR_URL } from "@dub/utils";
import { PropsWithChildren } from "react";
import { PartnerStatusBadgeWithTooltip } from "./partner-status-badge-with-tooltip";

export function PartnerInfoSection({
  partner,
  showPartnerStatus = true,
  children,
}: PropsWithChildren<{
  showPartnerStatus?: boolean;
  partner: Pick<
    EnrolledPartnerProps,
    | "id"
    | "name"
    | "image"
    | "email"
    | "status"
    | "bannedAt"
    | "bannedReason"
    | "country"
  >;
}>) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="relative w-fit">
          <img
            src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
            alt={partner.id}
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
        <div className="mt-4 flex min-w-0 items-start gap-2">
          <span
            className="min-w-0 max-w-full text-lg font-semibold leading-tight text-neutral-900"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            {partner.name}
          </span>
          {showPartnerStatus && (
            <PartnerStatusBadgeWithTooltip partner={partner} />
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
