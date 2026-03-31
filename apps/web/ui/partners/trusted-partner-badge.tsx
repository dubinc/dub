import { Tooltip } from "@dub/ui";

export function TrustedPartnerBadge() {
  return (
    <Tooltip
      content={
        <div className="flex max-w-xs items-start gap-2 p-3">
          <img
            alt="Trusted partner badge"
            src="https://assets.dub.co/icons/trusted-badge.svg"
            className="size-6 shrink-0"
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
      <div className="absolute -bottom-1 -right-1 overflow-hidden transition-transform duration-100 hover:scale-[1.15]">
        <img
          alt="Trusted partner badge"
          src="https://assets.dub.co/icons/trusted-badge.svg"
          className="size-6"
        />
      </div>
    </Tooltip>
  );
}
