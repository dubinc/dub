"use client";

import useDomain from "@/lib/swr/use-domain";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { QrCodesDisplayContext } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import { QRCode } from "@/ui/shared/qr-code.tsx";
import {
  ArrowTurnRight2,
  CopyButton,
  Tooltip,
  TooltipContent,
  useInViewport,
} from "@dub/ui";
import {
  Apple,
  ArrowRight,
  Cards,
  CircleHalfDottedClock,
  EarthPosition,
  Incognito,
  InputPassword,
  Robot,
  SquareChart,
} from "@dub/ui/icons";
import {
  cn,
  formatDateTime,
  getPrettyUrl,
  isDubDomain,
  linkConstructor,
  timeAgo,
} from "@dub/utils";
import { Icon } from "@iconify/react";
import { memo, PropsWithChildren, useContext, useRef } from "react";

const quickViewSettings = [
  { label: "Conversion Tracking", icon: SquareChart, key: "trackConversion" },
  { label: "Custom Link Preview", icon: Cards, key: "proxy" },
  { label: "Link Cloaking", icon: Incognito, key: "rewrite" },
  { label: "Password Protection", icon: InputPassword, key: "password" },
  { label: "Link Expiration", icon: CircleHalfDottedClock, key: "expiresAt" },
  { label: "iOS Targeting", icon: Apple, key: "ios" },
  { label: "Android Targeting", icon: Robot, key: "android" },
  { label: "Geo Targeting", icon: EarthPosition, key: "geo" },
];

export function QrCodeTitleColumn({ qrCode }: { qrCode: NewResponseQrCode }) {
  const { domain, key } = qrCode.link;

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex h-[32px] items-center gap-3 transition-[height] group-data-[variant=loose]/card-list:h-[60px]"
    >
      <QRCode url={qrCode.link.shortLink} scale={0.5} />

      <div className="w-[200px] min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 shrink grow-0 text-neutral-950">
            <div className="flex flex-col">
              <span
                className={cn(
                  "truncate text-sm font-semibold text-neutral-800",
                  qrCode.link.archived && "text-neutral-600",
                )}
              >
                {qrCode.title}
              </span>

              <div className="flex items-center gap-2">
                <UnverifiedTooltip domain={domain} _key={key}>
                  <a
                    href={linkConstructor({ domain, key })}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={linkConstructor({ domain, key, pretty: true })}
                    className={cn(
                      "truncate text-xs font-semibold text-neutral-800 transition-colors hover:text-black",
                      qrCode.link.archived && "text-neutral-600",
                    )}
                  >
                    {linkConstructor({ domain, key, pretty: true })}
                  </a>
                </UnverifiedTooltip>

                <CopyButton
                  value={linkConstructor({
                    domain,
                    key,
                    pretty: false,
                  })}
                  variant="neutral"
                  className="p-1"
                />
              </div>
            </div>
          </div>
          <Details qrCode={qrCode} compact />
        </div>

        <Details qrCode={qrCode} />
      </div>

      <div className="ml-2 flex items-center gap-0.5 overflow-hidden rounded-md border border-neutral-200/10 bg-neutral-50 px-1 py-0.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100">
        <Icon icon="basil:whatsapp-outline" className="text-md" />
        <span>{qrCode.qrType}</span>
      </div>
    </div>
  );
}

function UnverifiedTooltip({
  domain,
  _key,
  children,
}: PropsWithChildren<{ domain: string; _key: string }>) {
  const { slug } = useWorkspace();

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(ref);

  const { verified } = useDomain({ slug: domain, enabled: isVisible });

  return (
    <div ref={ref}>
      {!isDubDomain(domain) && verified === false ? (
        <Tooltip
          content={
            <TooltipContent
              title="Your branded links won't work until you verify your domain."
              cta="Verify your domain"
              href={`/${slug}/settings/domains`}
            />
          }
        >
          <p className="cursor-default truncate font-semibold leading-6 text-neutral-500 line-through">
            {linkConstructor({ domain, key: _key, pretty: true })}
          </p>
        </Tooltip>
      ) : (
        children
      )}
    </div>
  );
}

const Details = memo(
  ({ qrCode, compact }: { qrCode: NewResponseQrCode; compact?: boolean }) => {
    const { url, createdAt } = qrCode.link;

    const { displayProperties } = useContext(QrCodesDisplayContext);

    return (
      <div
        className={cn(
          "min-w-0 items-center whitespace-nowrap text-sm transition-[opacity,display] delay-[0s,150ms] duration-[150ms,0s]",
          compact
            ? [
                "hidden gap-2.5 opacity-0 group-data-[variant=compact]/card-list:flex group-data-[variant=compact]/card-list:opacity-100",
                "xs:min-w-[40px] xs:basis-[40px] min-w-0 shrink-0 grow basis-0 sm:min-w-[120px] sm:basis-[120px]",
              ]
            : "hidden gap-1.5 opacity-0 group-data-[variant=loose]/card-list:flex group-data-[variant=loose]/card-list:opacity-100 md:gap-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          {displayProperties.includes("url") &&
            (compact ? (
              <ArrowRight className="mr-1 h-3 w-3 shrink-0 text-neutral-400" />
            ) : (
              <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
            ))}
          {displayProperties.includes("url") ? (
            url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                className="truncate text-xs text-neutral-500 transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2"
              >
                {getPrettyUrl(url)}
              </a>
            ) : (
              <span className="truncate text-neutral-400">
                No URL configured
              </span>
            )
          ) : (
            <span className="truncate text-neutral-500">
              {qrCode.description}
            </span>
          )}
        </div>

        <div
          className={cn(
            "hidden shrink-0",
            displayProperties.includes("createdAt") && "sm:block",
          )}
        >
          <Tooltip content={formatDateTime(createdAt)} delayDuration={150}>
            <span className="text-neutral-400">{timeAgo(createdAt)}</span>
          </Tooltip>
        </div>
      </div>
    );
  },
);
