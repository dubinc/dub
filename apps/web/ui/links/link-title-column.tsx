"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps, UserProps } from "@/lib/types";
import {
  ArrowTurnRight2,
  Avatar,
  CopyButton,
  LinkLogo,
  Switch,
  Tooltip,
  TooltipContent,
  useIntersectionObserver,
} from "@dub/ui";
import {
  Apple,
  ArrowRight,
  Bolt,
  Cards,
  CircleHalfDottedClock,
  EarthPosition,
  EyeSlash,
  InputPassword,
  Page2,
  Robot,
} from "@dub/ui/src/icons";
import {
  cn,
  fetcher,
  formatDateTime,
  getApexDomain,
  isDubDomain,
  linkConstructor,
} from "@dub/utils";
import { formatDate } from "date-fns";
import { Mail } from "lucide-react";
import { PropsWithChildren, useRef } from "react";
import useSWR from "swr";
import { useAddEditLinkModal } from "../modals/add-edit-link-modal";
import { ResponseLink } from "./links-container";

const quickViewSettings = [
  { label: "Custom Social Media Cards", icon: Cards, key: "proxy" },
  { label: "Link Cloaking", icon: EyeSlash, key: "rewrite" },
  { label: "Password Protection", icon: InputPassword, key: "password" },
  { label: "Link Expiration", icon: CircleHalfDottedClock, key: "expiresAt" },
  { label: "iOS Targeting", icon: Apple, key: "ios" },
  { label: "Android Targeting", icon: Robot, key: "android" },
  { label: "Geo Targeting", icon: EarthPosition, key: "geo" },
];

export function LinkTitleColumn({ link }: { link: ResponseLink }) {
  const { url, domain, key } = link;

  const ref = useRef<HTMLDivElement>(null);

  // Use intersection observer for basic "virtualization" to improve transition performance
  const entry = useIntersectionObserver(ref, {});
  const isVisible = !!entry?.isIntersecting;

  const hasQuickViewSettings = quickViewSettings.some(({ key }) => link?.[key]);

  return (
    <div
      ref={ref}
      className="flex h-[32px] items-center gap-3 transition-[height] group-data-[variant=loose]/card-list:h-[60px]"
    >
      {isVisible && (
        <>
          <div className="relative hidden shrink-0 items-center justify-center sm:flex">
            {/* Link logo background circle */}
            <div className="absolute inset-0 shrink-0 rounded-full border border-gray-200 opacity-0 transition-opacity group-data-[variant=loose]/card-list:sm:opacity-100">
              <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-gray-100" />
            </div>
            <div className="relative pr-0.5 transition-[padding] group-data-[variant=loose]/card-list:sm:p-2">
              <LinkLogo
                apexDomain={getApexDomain(url)}
                className="h-4 w-4 shrink-0 transition-[width,height] sm:h-6 sm:w-6 group-data-[variant=loose]/card-list:sm:h-5 group-data-[variant=loose]/card-list:sm:w-5"
              />
            </div>
          </div>
          <div className="h-[24px] min-w-0 overflow-hidden transition-[height] group-data-[variant=loose]/card-list:h-[44px]">
            <div className="flex items-center gap-2">
              <div className="min-w-0 text-gray-950">
                <div className="flex items-center gap-2">
                  <UnverifiedTooltip link={link}>
                    <a
                      href={linkConstructor({ domain, key, pretty: false })}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={linkConstructor({ domain, key, pretty: true })}
                      className="truncate font-semibold leading-6 text-gray-800 transition-colors hover:text-black"
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
                    className="p-1.5"
                  />
                  {hasQuickViewSettings && <SettingsBadge link={link} />}
                  {link.comments && <CommentsBadge comments={link.comments} />}
                </div>
              </div>
              <Details link={link} compact />
            </div>

            <Details link={link} />
          </div>
        </>
      )}
    </div>
  );
}

function UnverifiedTooltip({
  link,
  children,
}: PropsWithChildren<{ link: ResponseLink }>) {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: { verified } = {}, isLoading } = useSWR<DomainProps>(
    !isDubDomain(link.domain) &&
      workspaceId &&
      `/api/domains/${link.domain}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return !isLoading && !isDubDomain(link.domain) && !verified ? (
    <Tooltip
      content={
        <TooltipContent
          title="Your branded links won't work until you verify your domain."
          cta="Verify your domain"
          href={`/${slug}/settings/domains`}
        />
      }
    >
      <div className="text-gray-500 line-through">{children}</div>
    </Tooltip>
  ) : (
    children
  );
}

function SettingsBadge({ link }: { link: ResponseLink }) {
  const settings = quickViewSettings.filter(({ key }) => link?.[key]);

  const { AddEditLinkModal, setShowAddEditLinkModal } = useAddEditLinkModal({
    props: link,
  });

  return (
    <div className="hidden sm:block">
      <AddEditLinkModal />
      <Tooltip
        content={({ setOpen }) => (
          <div className="flex w-[340px] flex-col p-3 text-sm">
            {settings.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowAddEditLinkModal(true);
                }}
                className="flex items-center justify-between gap-4 rounded-lg p-3 transition-colors hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-950">{label}</span>
                </div>
                <Switch checked />
              </button>
            ))}
          </div>
        )}
        side="bottom"
      >
        <div className="rounded-full p-1.5 hover:bg-gray-100">
          <Bolt className="size-3.5" />
        </div>
      </Tooltip>
    </div>
  );
}

function CommentsBadge({ comments }: { comments: string }) {
  return (
    <div className="hidden sm:block">
      <Tooltip
        content={
          <div className="divide-y-gray-200 divide-y text-sm">
            <div className="flex items-center gap-2 px-4 py-3">
              <Page2 className="size-3.5" />
              <span className="text-gray-500">Link comments</span>
            </div>
            <p className="max-w-[300px] px-5 py-3 text-gray-700">{comments}</p>
          </div>
        }
        side="bottom"
      >
        <div className="rounded-full p-1.5 hover:bg-gray-100">
          <Page2 className="size-3.5" />
        </div>
      </Tooltip>
    </div>
  );
}

function Details({ link, compact }: { link: ResponseLink; compact?: boolean }) {
  const { url, user, createdAt } = link;
  return (
    <div
      className={cn(
        "min-w-0 items-center gap-1.5 whitespace-nowrap text-sm transition-[opacity,display] delay-[0s,150ms] duration-[150ms,0s] md:gap-3",
        compact
          ? "hidden opacity-0 group-data-[variant=compact]/card-list:flex group-data-[variant=compact]/card-list:opacity-100"
          : "hidden opacity-0 group-data-[variant=loose]/card-list:flex group-data-[variant=loose]/card-list:opacity-100",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {compact ? (
          <ArrowRight className="mr-1 h-3 w-3 text-gray-400" />
        ) : (
          <ArrowTurnRight2 className="h-3 w-3 text-gray-400" />
        )}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="truncate text-gray-500 transition-colors hover:text-gray-700 hover:underline"
          >
            {url.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="truncate text-gray-400">No URL configured</span>
        )}
      </div>
      <div className="hidden shrink-0 sm:block">
        <UserAvatar user={user} />
      </div>
      <div className="hidden sm:block">
        <Tooltip content={formatDateTime(createdAt)}>
          <span className="text-gray-400">
            {formatDate(createdAt, "MMM d")}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: UserProps }) {
  const { slug } = useWorkspace();

  return (
    <Tooltip
      content={
        <div className="w-full p-3">
          <Avatar user={user} className="h-8 w-8" />
          <div className="mt-2 flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-700">
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
          {user?.name && user.email && (
            <p className="mt-1 text-xs text-gray-500">{user.email}</p>
          )}
        </div>
      }
    >
      <div>
        <Avatar user={user} className="h-4 w-4" />
      </div>
    </Tooltip>
  );
}
