import useWorkspace from "@/lib/swr/use-workspace";
import { TagProps } from "@/lib/types";
import {
  Button,
  CardList,
  CopyButton,
  CursorRays,
  InvoiceDollar,
  Tooltip,
  useMediaQuery,
  UserCheck,
  useRouterStuff,
} from "@dub/ui";
import { ReferredVia } from "@dub/ui/src/icons";
import {
  APP_DOMAIN,
  cn,
  currencyFormatter,
  nFormatter,
  pluralize,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";
import { LinkControls } from "./link-controls";
import { ResponseLink } from "./links-container";
import { LinksDisplayContext } from "./links-display-provider";
import TagBadge from "./tag-badge";

function useOrganizedTags(tags: ResponseLink["tags"]) {
  const searchParams = useSearchParams();

  const [primaryTag, additionalTags] = useMemo(() => {
    const filteredTagIds =
      searchParams?.get("tagIds")?.split(",")?.filter(Boolean) ?? [];

    /*
      Sort tags so that the filtered tags are first. The most recently selected
      filtered tag (last in array) should be displayed first.
    */
    const sortedTags =
      filteredTagIds.length > 0
        ? [...tags].sort(
            (a, b) =>
              filteredTagIds.indexOf(b.id) - filteredTagIds.indexOf(a.id),
          )
        : tags;

    return [sortedTags?.[0], sortedTags.slice(1)];
  }, [tags, searchParams]);

  return { primaryTag, additionalTags };
}

export function LinkDetailsColumn({ link }: { link: ResponseLink }) {
  const { tags } = link;

  const { displayProperties } = useContext(LinksDisplayContext);

  const ref = useRef<HTMLDivElement>(null);

  const { primaryTag, additionalTags } = useOrganizedTags(tags);

  return (
    <div ref={ref} className="flex items-center justify-end gap-2 sm:gap-5">
      {displayProperties.includes("tags") && primaryTag && (
        <TagsTooltip additionalTags={additionalTags}>
          <TagButton tag={primaryTag} plus={additionalTags.length} />
        </TagsTooltip>
      )}
      {displayProperties.includes("analytics") && (
        <AnalyticsBadge link={link} />
      )}
      <LinkControls link={link} />
    </div>
  );
}

function TagsTooltip({
  additionalTags,
  children,
}: PropsWithChildren<{ additionalTags: TagProps[] }>) {
  return !!additionalTags.length ? (
    <Tooltip
      content={
        <div className="flex flex-wrap gap-1.5 p-3">
          {additionalTags.map((tag) => (
            <TagButton key={tag.id} tag={tag} />
          ))}
        </div>
      }
      side="top"
      align="end"
    >
      <div>{children}</div>
    </Tooltip>
  ) : (
    children
  );
}

function TagButton({ tag, plus }: { tag: TagProps; plus?: number }) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  const selectedTagIds =
    searchParams?.get("tagIds")?.split(",")?.filter(Boolean) ?? [];

  return (
    <button
      onClick={() => {
        let newTagIds = selectedTagIds.includes(tag.id)
          ? selectedTagIds.filter((id) => id !== tag.id)
          : [...selectedTagIds, tag.id];

        queryParams({
          set: {
            tagIds: newTagIds.join(","),
          },
          del: [...(newTagIds.length ? [] : ["tagIds"])],
        });
      }}
    >
      <TagBadge {...tag} withIcon plus={plus} />
    </button>
  );
}

function AnalyticsBadge({ link }: { link: ResponseLink }) {
  const { domain, key, trackConversion } = link;

  const { slug } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const { variant } = useContext(CardList.Context);

  const stats = useMemo(
    () => [
      {
        id: "clicks",
        icon: CursorRays,
        value: link.clicks,
        label: trackConversion
          ? undefined
          : (value) => pluralize("click", value),
      },
      ...(trackConversion
        ? [
            {
              id: "leads",
              icon: UserCheck,
              value: link.leads,
              className: "hidden sm:flex",
            },
            {
              id: "sales",
              icon: InvoiceDollar,
              value: link.saleAmount,
              className: "hidden sm:flex",
            },
          ]
        : []),
    ],
    [trackConversion, link],
  );

  const { ShareDashboardModal, setShowShareDashboardModal } =
    useShareDashboardModal({ domain, _key: key });

  // Hacky fix for making sure the tooltip closes (by rerendering) when the modal opens
  const [modalShowCount, setModalShowCount] = useState(0);

  return isMobile ? (
    <Link
      href={`/${slug}/analytics?domain=${domain}&key=${key}`}
      className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm text-gray-800"
    >
      <CursorRays className="h-4 w-4 text-gray-600" />
      {nFormatter(link.clicks)}
    </Link>
  ) : (
    <>
      <ShareDashboardModal />
      <Tooltip
        key={modalShowCount}
        side="top"
        content={
          <div className="flex flex-col gap-2.5 whitespace-nowrap p-3 text-gray-600">
            {stats.map(({ id: tab, value }) => (
              <div key={tab} className="text-sm leading-none">
                <span className="font-medium text-gray-950">
                  {tab === "sales"
                    ? currencyFormatter(value / 100)
                    : nFormatter(value, { full: value < 1000000000 })}
                </span>{" "}
                {pluralize(tab.slice(0, -1), value)}
              </div>
            ))}
            <p className="text-xs leading-none text-gray-400">
              {link.lastClicked
                ? `Last clicked ${timeAgo(link.lastClicked, {
                    withAgo: true,
                  })}`
                : "No clicks yet"}
            </p>

            <div className="inline-flex items-start justify-start gap-2">
              <Button
                text={link.dashboardId ? "Edit sharing" : "Share dashboard"}
                className="h-7 w-full px-2"
                onClick={() => {
                  setShowShareDashboardModal(true);
                  setModalShowCount((c) => c + 1);
                }}
              />

              {link.dashboardId && (
                <CopyButton
                  value={`${APP_DOMAIN}/share/${link.dashboardId}`}
                  variant="neutral"
                  className="h-7 items-center justify-center rounded-md border border-neutral-300 bg-white p-1.5 hover:bg-gray-50 active:bg-gray-100"
                />
              )}
            </div>
          </div>
        }
      >
        <Link
          href={`/${slug}/analytics?domain=${domain}&key=${key}`}
          className={cn(
            "overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800",
            variant === "loose" ? "hover:bg-gray-100" : "hover:bg-white",
          )}
        >
          <div className="hidden items-center sm:flex">
            {stats.map(({ id: tab, icon: Icon, value, className, label }) => (
              <div
                key={tab}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 transition-colors",
                  className,
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-600" />
                <span>
                  {tab === "sales"
                    ? currencyFormatter(value / 100)
                    : nFormatter(value)}
                  {label && (
                    <span className="hidden md:inline-block">
                      &nbsp;{label(value)}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {link.dashboardId && (
              <div className="border-l border-gray-200 px-1.5">
                <ReferredVia className="h-4 w-4 shrink-0 text-gray-600" />
              </div>
            )}
          </div>
        </Link>
      </Tooltip>
    </>
  );
}
