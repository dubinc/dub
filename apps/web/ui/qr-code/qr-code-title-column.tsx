"use client";

import useDomain from "@/lib/swr/use-domain";
import useWorkspace from "@/lib/swr/use-workspace";
import { QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { AnalyticsBadge } from "@/ui/qr-code/qr-code-details-column.tsx";
import { QRCode } from "@/ui/shared/qr-code.tsx";
import {
  ArrowTurnRight2,
  CopyButton,
  Tooltip,
  TooltipContent,
  useInViewport,
  useMediaQuery,
} from "@dub/ui";
import { ArrowRight } from "@dub/ui/icons";
import {
  cn,
  formatDateTime,
  getPrettyUrl,
  isDubDomain,
  linkConstructor,
  timeAgo,
} from "@dub/utils";
import { Icon } from "@iconify/react";
import { Flex, Text } from "@radix-ui/themes";
import { memo, PropsWithChildren, useContext, useRef } from "react";
import { ResponseQrCode } from "./qr-codes-container";
import { QrCodesDisplayContext } from "./qr-codes-display-provider";

export function QrCodeTitleColumn({ qrCode }: { qrCode: ResponseQrCode }) {
  const { domain, key, createdAt, shortLink, archived, title } =
    qrCode?.link ?? {};
  const { isMobile } = useMediaQuery();

  const ref = useRef<HTMLDivElement>(null);

  const currentQrType = QR_TYPES.find((item) => item.id === qrCode.qrType);

  return (
    <div
      ref={ref}
      className="flex h-full flex-row items-start transition-[height] md:items-center md:gap-6 xl:gap-12"
    >
      <div className="flex h-full flex-row items-center justify-center gap-1">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <QRCode url={shortLink} scale={isMobile ? 0.8 : 0.6} />
          {archived ? (
            <div
              className={cn(
                "flex w-full justify-center overflow-hidden rounded-md border border-neutral-200/10 md:hidden",
                "bg-neutral-50 p-0.5 px-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-100",
                "bg-red-100 text-red-600",
              )}
            >
              Deactivated
            </div>
          ) : (
            <div className="flex flex-col gap-2 md:hidden">
              <AnalyticsBadge qrCode={qrCode} />
            </div>
          )}
        </div>

        <div className="flex h-full min-h-[75px] w-[200px] min-w-0 flex-col items-start justify-between overflow-hidden md:justify-center md:gap-2">
          <Flex
            direction="column"
            gap="1"
            align="start"
            justify="start"
            className="pt-1"
          >
            <Flex direction="row" gap="1" align="center" justify="center">
              <Icon
                icon={currentQrType!.icon!}
                className="text-secondary text-lg"
              />
              <Text as="span" size="2" weight="bold" className="text-secondary">
                {currentQrType!.label!}
              </Text>
            </Flex>
            {title ? (
              <span
                className={cn(
                  "max-w-[180px] truncate text-sm font-semibold text-neutral-800",
                  archived && "text-neutral-600",
                )}
              >
                {title}
              </span>
            ) : (
              <ShortLinkWrapper
                domain={domain}
                linkKey={key}
                link={qrCode.link}
                linkClassname="block max-w-[180px] text-sm font-semibold text-neutral-800 truncate"
                hideCopy
              />
            )}
            <Tooltip
              className="block md:hidden"
              content={formatDateTime(createdAt)}
              delayDuration={150}
            >
              <span className="inline-flex text-xs text-neutral-500 md:hidden">
                {timeAgo(createdAt)}
              </span>
            </Tooltip>
            <div className="flex flex-col gap-1 md:hidden [&_a]:max-w-[200px]">
              <Details link={qrCode.link} hideIcon />
            </div>
          </Flex>
        </div>
      </div>

      <div className="hidden flex-col gap-1 xl:flex">
        <Text as="span" size="2" weight="bold">
          Your Link
        </Text>
        <Details link={qrCode.link} hideIcon />
      </div>
      <div
        className={cn(
          "hidden shrink-0 flex-col items-start justify-center gap-1 pl-6 md:flex",
        )}
      >
        <Text as="span" size="2" weight="bold" className="text-neutral-800">
          Created
        </Text>
        <Tooltip content={formatDateTime(createdAt)} delayDuration={150}>
          <span className="text-neutral-500">{timeAgo(createdAt)}</span>
        </Tooltip>
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
  ({
    link,
    compact,
    hideIcon,
  }: {
    link: ResponseQrCode["link"];
    compact?: boolean;
    hideIcon?: boolean;
  }) => {
    const { url } = link;

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
            !hideIcon &&
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
                className="max-w-[180px] truncate text-xs text-neutral-600 transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2 md:min-w-[180px]"
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
              {link.description}
            </span>
          )}
        </div>
      </div>
    );
  },
);

function ShortLinkWrapper({
  domain,
  linkKey,
  link,
  linkClassname,
  hideCopy = false,
}: PropsWithChildren<{
  domain: string;
  linkKey: string;
  link: ResponseQrCode["link"];
  linkClassname?: string;
  hideCopy?: boolean;
}>) {
  return (
    <div className="flex items-center gap-2">
      <UnverifiedTooltip domain={domain} _key={linkKey}>
        <a
          href={linkConstructor({ domain, key: linkKey })}
          target="_blank"
          rel="noopener noreferrer"
          title={linkConstructor({ domain, key: linkKey, pretty: true })}
          className={cn(
            "truncate text-sm font-semibold text-neutral-800 transition-colors hover:text-black",
            link.archived && "text-neutral-600",
            linkClassname,
          )}
        >
          {linkConstructor({ domain, key: linkKey, pretty: true })}
        </a>
      </UnverifiedTooltip>

      {!hideCopy && (
        <CopyButton
          value={linkConstructor({
            domain,
            key: linkKey,
            pretty: false,
          })}
          variant="neutral"
          className="p-1"
        />
      )}
    </div>
  );
}
