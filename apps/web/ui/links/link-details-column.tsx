import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
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
import { ReferredVia } from "@dub/ui/icons";
import {
  APP_DOMAIN,
  cn,
  currencyFormatter,
  INFINITY_NUMBER,
  nFormatter,
  pluralize,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  memo,
  PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";
import { LinkControls } from "./link-controls";
import { useLinkSelection } from "./link-selection-provider";
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
      <Controls link={link} />
    </div>
  );
}

const Controls = memo(({ link }: { link: ResponseLink }) => {
  const { isSelectMode } = useLinkSelection();

  return (
    <div className={cn(isSelectMode && "hidden sm:block")}>
      <LinkControls link={link} />
    </div>
  );
});

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
  const { slug, plan } = useWorkspace();
  const { domain, key, trackConversion, clicks, leads, saleAmount } = link;

  const { isMobile } = useMediaQuery();
  const { variant } = useContext(CardList.Context);

  const stats = useMemo(
    () => [
      {
        id: "clicks",
        icon: CursorRays,
        value: clicks,
        iconClassName: "data-[active=true]:text-blue-500",
      },
      // show leads and sales if:
      // 1. link has trackConversion enabled
      // 2. link has leads or sales
      ...(trackConversion || leads > 0 || saleAmount > 0
        ? [
            {
              id: "leads",
              icon: UserCheck,
              value: leads,
              className: "hidden sm:flex",
              iconClassName: "data-[active=true]:text-purple-500",
            },
            {
              id: "sales",
              icon: InvoiceDollar,
              value: saleAmount,
              className: "hidden sm:flex",
              iconClassName: "data-[active=true]:text-teal-500",
            },
          ]
        : []),
    ],
    [link],
  );

  const { ShareDashboardModal, setShowShareDashboardModal } =
    useShareDashboardModal({ domain, _key: key });

  // Hacky fix for making sure the tooltip closes (by rerendering) when the modal opens
  const [modalShowCount, setModalShowCount] = useState(0);

  const canManageLink = useCheckFolderPermission(
    link.folderId,
    "folders.links.write",
  );

  return isMobile ? (
    <Link
      href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
      className="border-neutral200 bg-neutral50 text-neutral800 flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm"
    >
      <CursorRays className="text-neutral600 h-4 w-4" />
      {nFormatter(link.clicks)}
    </Link>
  ) : (
    <>
      <ShareDashboardModal />
      <Tooltip
        key={modalShowCount}
        side="top"
        content={
          <div className="text-neutral600 bg-bgMain flex flex-col gap-2.5 whitespace-nowrap p-3">
            {stats.map(({ id: tab, value }) => (
              <div key={tab} className="text-sm leading-none">
                <span className="text-neutral950 font-medium">
                  {tab === "sales"
                    ? currencyFormatter(value / 100)
                    : nFormatter(value, { full: value < INFINITY_NUMBER })}
                </span>{" "}
                {tab === "sales" ? "total " : ""}
                {pluralize(tab.slice(0, -1), value)}
              </div>
            ))}
            <p className="text-neutral400 text-xs leading-none">
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
                disabled={!canManageLink}
              />

              {true && (
                <CopyButton
                  value={`${APP_DOMAIN}/share/${link.dashboardId}`}
                  variant="neutral"
                  className="border-neutral300 hover:bg-neutral50 bg-bgMain active:bg-neutral100 h-7 items-center justify-center rounded-md border p-1.5"
                />
              )}
            </div>
          </div>
        }
      >
        <Link
          href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
          className={cn(
            "border-neutral200 bg-neutral50 text-neutral600 overflow-hidden rounded-md border p-0.5 text-sm transition-colors",
            variant === "loose" ? "hover:bg-neutral100" : "hover:bg-bgMain",
          )}
        >
          <div className="hidden items-center gap-0.5 sm:flex">
            {stats.map(
              ({ id: tab, icon: Icon, value, className, iconClassName }) => (
                <div
                  key={tab}
                  className={cn(
                    "flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-px transition-colors",
                    className,
                  )}
                >
                  <Icon
                    data-active={value > 0}
                    className={cn("h-4 w-4 shrink-0", iconClassName)}
                  />
                  <span>
                    {tab === "sales"
                      ? currencyFormatter(value / 100)
                      : nFormatter(value)}
                    {stats.length === 1 && " clicks"}
                  </span>
                </div>
              ),
            )}
            {link.dashboardId && (
              <div className="border-neutral200 border-l px-1.5">
                <ReferredVia className="text-neutral600 h-4 w-4 shrink-0" />
              </div>
            )}
          </div>
        </Link>
      </Tooltip>
    </>
  );
}
