import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { getUrlFromString, isValidUrl } from "@dub/utils";
import { PropsWithChildren } from "react";

export function PartnerSocialColumn({
  at,
  value,
  verified,
  href,
}: {
  at?: boolean;
  value: string;
  verified: boolean;
  href: string;
}) {
  return value && href ? (
    <LinkIfValid
      href={getUrlFromString(href)}
      className="flex items-center gap-2 hover:underline"
    >
      <span className="min-w-0 truncate">
        {at && "@"}
        {value}
      </span>
      {verified && (
        <Tooltip content="Verified" disableHoverableContent>
          <div>
            <BadgeCheck2Fill className="size-4 text-green-600" />
          </div>
        </Tooltip>
      )}
    </LinkIfValid>
  ) : (
    "-"
  );
}

const LinkIfValid = ({
  href,
  className,
  children,
}: PropsWithChildren<{ href: string; className?: string }>) => {
  return isValidUrl(href) ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  );
};
