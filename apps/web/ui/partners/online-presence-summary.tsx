import { ONLINE_PRESENCE_FIELDS } from "@/lib/partners/online-presence";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { cn } from "@dub/utils";
import { Fragment } from "react";
import { OnlinePresenceCard } from "./online-presence-card";

export function OnlinePresenceSummary({
  partner,
  showLabels = true,
  className,
  emptyClassName,
}: {
  partner: Pick<
    EnrolledPartnerExtendedProps,
    | "website"
    | "websiteVerifiedAt"
    | "youtube"
    | "youtubeSubscriberCount"
    | "youtubeVerifiedAt"
    | "youtubeViewCount"
    | "twitter"
    | "twitterVerifiedAt"
    | "linkedin"
    | "linkedinVerifiedAt"
    | "instagram"
    | "instagramVerifiedAt"
    | "tiktok"
    | "tiktokVerifiedAt"
  >;
  showLabels?: boolean;
  className?: string;
  emptyClassName?: string;
}) {
  const fieldData = ONLINE_PRESENCE_FIELDS.map((field) => ({
    label: field.label,
    icon: field.icon,
    ...field.data(partner),
  })).filter((field) => field.value && field.href);

  return fieldData.length ? (
    <div
      className={cn(
        "grid items-center gap-x-4 gap-y-5 text-sm md:gap-x-16",
        showLabels ? "grid-cols-[max-content_minmax(0,1fr)]" : "grid-cols-1",
        className,
      )}
    >
      {fieldData.map(({ label, icon: Icon, value, verified, href, info }) => {
        return (
          <Fragment key={label}>
            {showLabels && (
              <span className="text-content-default font-medium">{label}</span>
            )}
            <div>
              <OnlinePresenceCard
                icon={Icon}
                value={value ?? ""}
                verified={verified}
                info={info}
                href={href ?? undefined}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  ) : (
    <div
      className={cn(
        "text-sm italic text-neutral-400",
        className,
        emptyClassName,
      )}
    >
      No online presence provided
    </div>
  );
}
