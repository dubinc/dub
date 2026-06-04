import { Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";

const TRUSTED_BADGE_SRC = "https://assets.dub.co/icons/trusted-badge.svg";

export function TrustedPartnerBadge({
  variant = "overlay",
}: {
  variant?: "overlay" | "inline";
}) {
  const badge = (
    <img
      alt="Trusted partner badge"
      src={TRUSTED_BADGE_SRC}
      className={cn("shrink-0", variant === "inline" ? "size-3.5" : "size-6")}
    />
  );

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs items-start gap-1.5 p-3">
          <img
            alt="Trusted partner badge"
            src={TRUSTED_BADGE_SRC}
            className="size-5 shrink-0"
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900">
              Trusted Partner
            </span>
            <span className="text-sm font-normal text-neutral-600">
              This partner is a top-performer and trusted on the Dub Partner
              Network.
            </span>
          </div>
        </div>
      }
    >
      {variant === "inline" ? (
        <span className="shrink-0">{badge}</span>
      ) : (
        <div className="absolute -bottom-1 -right-1 overflow-hidden transition-transform duration-100 hover:scale-[1.15]">
          {badge}
        </div>
      )}
    </Tooltip>
  );
}
