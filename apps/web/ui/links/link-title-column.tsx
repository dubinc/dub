"use client";

import useDomain from "@/lib/swr/use-domain";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsBadge } from "@/ui/links/link-details-column.tsx";
import { QRCode } from "@/ui/shared/qr-code.tsx";
import {
  ArrowTurnRight2,
  Avatar,
  CopyButton,
  Switch,
  Tooltip,
  TooltipContent,
  useInViewport,
  useMediaQuery,
} from "@dub/ui";
import {
  Apple,
  ArrowRight,
  Bolt,
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
import * as HoverCard from "@radix-ui/react-hover-card";
import { Flex, Text } from "@radix-ui/themes";
import { Mail } from "lucide-react";
import { memo, PropsWithChildren, useContext, useRef, useState } from "react";
import { useLinkBuilder } from "../modals/link-builder";
import { ResponseLink } from "./links-container";
import { LinksDisplayContext } from "./links-display-provider";

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

export function LinkTitleColumn({ link }: { link: ResponseLink }) {
  const { url, domain, key, createdAt } = link;
  const { isMobile } = useMediaQuery();

  // const { variant } = useContext(CardList.Context);
  // @USEFUL_FEATURE: display config of link table
  // const { displayProperties } = useContext(LinksDisplayContext);

  const ref = useRef<HTMLDivElement>(null);

  // const hasQuickViewSettings = quickViewSettings.some(({ key }) => link?.[key]);

  // const searchParams = useSearchParams();
  // const { slug } = useWorkspace();
  // const { folders } = useFolders();
  // const folder = folders?.find((folder) => folder.id === link.folderId);

  return (
    <div
      ref={ref}
      className="flex h-full flex-row items-start transition-[height] md:items-center md:gap-6 xl:gap-12"
    >
      {/*{variant === "compact" &&*/}
      {/*  link.folderId &&*/}
      {/*  searchParams.get("folderId") !== link.folderId && (*/}
      {/*    <Link href={`/${slug}?folderId=${link.folderId}`}>*/}
      {/*      {folder ? (*/}
      {/*        <FolderIcon*/}
      {/*          folder={folder}*/}
      {/*          shape="square"*/}
      {/*          innerClassName="p-1.5"*/}
      {/*        />*/}
      {/*      ) : (*/}
      {/*        <div className="size-4 rounded-md bg-neutral-200" />*/}
      {/*      )}*/}
      {/*    </Link>*/}
      {/*  )}*/}

      <div className="flex h-full flex-row items-center justify-center gap-1">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <QRCode url={link.shortLink} scale={isMobile ? 0.8 : 0.6} />
          {link.archived ? (
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
              <AnalyticsBadge link={link} />
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
                icon="basil:whatsapp-outline"
                className="text-secondary text-lg"
              />
              <Text as="span" size="2" weight="bold" className="text-secondary">
                Whatsapp
              </Text>
            </Flex>
            {link.title ? (
              <span
                className={cn(
                  "max-w-[180px] truncate text-sm font-semibold text-neutral-800",
                  link.archived && "text-neutral-600",
                )}
              >
                {link.title}
              </span>
            ) : (
              <ShortLinkWrapper
                domain={domain}
                linkKey={key}
                link={link}
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
              <Details link={link} hideIcon />
            </div>
          </Flex>

          {/*{hasQuickViewSettings && <SettingsBadge link={link} />}*/}
          {/*{link.comments && <CommentsBadge comments={link.comments} />}*/}
          {/*</div>*/}
        </div>
      </div>

      <div className="hidden flex-col gap-1 xl:flex">
        {/*<ShortLinkWrapper domain={domain} linkKey={key} link={link} />*/}
        <Text as="span" size="2" weight="bold">
          Your Link
        </Text>
        <Details link={link} hideIcon />
      </div>
      {
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
      }
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

function SettingsBadge({ link }: { link: ResponseLink }) {
  const settings = quickViewSettings.filter(({ key }) => link?.[key]);

  const { LinkBuilder, setShowLinkBuilder } = useLinkBuilder({
    props: link,
  });

  const [open, setOpen] = useState(false);

  return (
    <div className="hidden sm:block">
      <LinkBuilder />
      <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className="flex w-[340px] flex-col p-3 text-sm">
              {settings.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowLinkBuilder(true);
                  }}
                  className="flex items-center justify-between gap-4 rounded-lg p-3 transition-colors hover:bg-neutral-100"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 text-neutral-600" />
                    <span className="text-neutral-950">{label}</span>
                  </div>
                  <Switch checked />
                </button>
              ))}
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
        <HoverCard.Trigger asChild>
          <div className="rounded-full p-1.5 hover:bg-neutral-100">
            <Bolt className="size-3.5" />
          </div>
        </HoverCard.Trigger>
      </HoverCard.Root>
    </div>
  );
}

const Details = memo(
  ({
    link,
    compact,
    hideIcon,
  }: {
    link: ResponseLink;
    compact?: boolean;
    hideIcon?: boolean;
  }) => {
    const { url, createdAt } = link;

    const { displayProperties } = useContext(LinksDisplayContext);

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
        {/* @USEFUL_FEATURE: display user avatar */}
        {/*<div*/}
        {/*  className={cn(*/}
        {/*    "hidden shrink-0",*/}
        {/*    displayProperties.includes("user") && "sm:block",*/}
        {/*  )}*/}
        {/*>*/}
        {/*  <UserAvatar link={link} />*/}
        {/*</div>*/}
        {/*<div*/}
        {/*  className={cn(*/}
        {/*    "hidden shrink-0",*/}
        {/*    displayProperties.includes("createdAt") && "sm:block",*/}
        {/*  )}*/}
        {/*>*/}
        {/*  <Tooltip content={formatDateTime(createdAt)} delayDuration={150}>*/}
        {/*    <span className="text-neutral-400">{timeAgo(createdAt)}</span>*/}
        {/*  </Tooltip>*/}
        {/*</div>*/}
      </div>
    );
  },
);

function UserAvatar({ link }: { link: ResponseLink }) {
  const { user } = link;
  const { slug } = useWorkspace();

  return (
    <Tooltip
      content={
        <div className="w-full p-3">
          <Avatar user={user} className="h-8 w-8" />
          <div className="mt-2 flex items-center gap-1.5">
            <p className="text-sm font-semibold text-neutral-700">
              {user?.name || user?.email || "Anonymous User"}
            </p>
            {!slug && // this is only shown in admin mode (where there's no slug)
              user?.email && (
                <CopyButton
                  value={user.email}
                  icon={Mail}
                  className="[&>*]:h-3 [&>*]:w-3"
                />
              )}
          </div>
          <div className="flex flex-col gap-1 text-xs text-neutral-500">
            {user?.name && user.email && <p>{user.email}</p>}
          </div>
        </div>
      }
      delayDuration={150}
    >
      <div>
        <Avatar user={user} className="size-4" />
      </div>
    </Tooltip>
  );
}

function ShortLinkWrapper({
  domain,
  linkKey,
  link,
  linkClassname,
  hideCopy = false,
}: PropsWithChildren<{
  domain: string;
  linkKey: string;
  link: ResponseLink;
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
