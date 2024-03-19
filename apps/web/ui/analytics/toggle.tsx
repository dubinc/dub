import { INTERVALS } from "@/lib/analytics";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BadgeTooltip,
  BlurImage,
  ExpandingArrow,
  IconMenu,
  Popover,
  Tick,
  Tooltip,
  TooltipContent,
  useRouterStuff,
  useScroll,
} from "@dub/ui";
import {
  APP_DOMAIN,
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  SHORT_DOMAIN,
  cn,
  getApexDomain,
  linkConstructor,
} from "@dub/utils";
import { Calendar, ChevronDown, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import punycode from "punycode/";
import { useContext, useMemo, useState } from "react";
import { AnalyticsContext } from ".";
import SharePopover from "./share-popover";
import TagSelector from "./tag-selector";

export default function Toggle() {
  const { queryParams } = useRouterStuff();

  const { basePath, domain, key, url, interval, admin } =
    useContext(AnalyticsContext);

  const [openDatePopover, setOpenDatePopover] = useState(false);

  const selectedInterval = useMemo(() => {
    return INTERVALS.find((s) => s.value === interval) || INTERVALS[1];
  }, [interval]);

  const scrolled = useScroll(80);
  const { name, plan, logo } = useWorkspace();
  const { allActiveDomains, primaryDomain } = useDomains();

  const isPublicStatsPage = basePath.startsWith("/stats");

  return (
    <div
      className={cn("sticky top-[6.85rem] z-10 mb-5 bg-gray-50 py-3 md:py-5", {
        "top-14": isPublicStatsPage,
        "top-0": admin,
        "shadow-md": scrolled,
      })}
    >
      <div className="mx-auto flex h-20 max-w-4xl flex-col items-center justify-between space-y-3 px-2.5 md:h-10 md:flex-row md:space-y-0 lg:px-0">
        {isPublicStatsPage ? (
          <a
            className="group flex items-center text-lg font-semibold text-gray-800"
            href={linkConstructor({ domain, key })}
            target="_blank"
            rel="noreferrer"
          >
            <BlurImage
              alt={url || "Dub.co"}
              src={
                url ? `${GOOGLE_FAVICON_URL}${getApexDomain(url)}` : DUB_LOGO
              }
              className="mr-2 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            {linkConstructor({
              domain: punycode.toUnicode(domain),
              key,
              pretty: true,
            })}
            <ExpandingArrow className="h-5 w-5" />
          </a>
        ) : (
          <div className="flex items-center space-x-2">
            <BlurImage
              alt={name || "Workspace Logo"}
              src={logo || DUB_LOGO}
              className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            <h2 className="text-lg font-semibold text-gray-800">
              {primaryDomain}
            </h2>
            {allActiveDomains && allActiveDomains.length > 1 && (
              <BadgeTooltip content={<DomainsFilterTooltip />}>
                +{allActiveDomains.length - 1}
              </BadgeTooltip>
            )}
          </div>
        )}
        <div className="flex w-full items-center justify-end gap-2">
          {!isPublicStatsPage && key && <SharePopover />}
          {!isPublicStatsPage && !key && <TagSelector />}
          <Popover
            content={
              <div className="grid w-full p-2 md:w-48">
                {INTERVALS.map(({ display, value }) =>
                  (value === "all" || value === "90d") &&
                  (!plan || plan === "free") &&
                  !admin ? (
                    <Tooltip
                      key={value}
                      content={
                        <TooltipContent
                          title={`${display} stats can only be viewed on a Pro plan or higher. Upgrade now to view all-time stats.`}
                          cta="Upgrade to Pro"
                          {...(isPublicStatsPage
                            ? {
                                href: APP_DOMAIN,
                              }
                            : {
                                onClick: () => {
                                  setOpenDatePopover(false);
                                  queryParams({
                                    set: {
                                      upgrade: "pro",
                                    },
                                  });
                                },
                              })}
                        />
                      }
                    >
                      <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                        <p>{display}</p>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </Tooltip>
                  ) : (
                    <Link
                      key={value}
                      href={
                        queryParams({
                          set: { interval: value },
                          getNewPath: true,
                        }) as string
                      }
                      className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <p className="text-sm">{display}</p>
                      {selectedInterval.value === value && (
                        <Tick className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Link>
                  ),
                )}
              </div>
            }
            openPopover={openDatePopover}
            setOpenPopover={setOpenDatePopover}
          >
            <button
              onClick={() => setOpenDatePopover(!openDatePopover)}
              className="flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all hover:shadow-md md:w-48"
            >
              <IconMenu
                text={selectedInterval.display}
                icon={<Calendar className="h-4 w-4" />}
              />
              <ChevronDown
                className={`h-5 w-5 text-gray-400 ${
                  openDatePopover ? "rotate-180 transform" : ""
                } transition-all duration-75`}
              />
            </button>
          </Popover>
        </div>
      </div>
    </div>
  );
}

const DomainsFilterTooltip = () => {
  const { allActiveDomains } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");
  const key = searchParams?.get("key");
  const { queryParams } = useRouterStuff();

  return (
    <div className="flex w-full flex-col items-start space-y-2 divide-y divide-gray-200 p-2 md:w-48">
      <div className="flex w-full flex-col">
        {allActiveDomains.map(({ slug, target }) => (
          <Link
            key={slug}
            href={
              queryParams({
                set: {
                  domain: slug,
                },
                del: "key",
                getNewPath: true,
              }) as string
            }
            className="group flex items-center justify-between space-x-2 rounded-md p-2 text-gray-500 transition-all hover:bg-gray-100 active:bg-gray-200"
          >
            <div className="flex items-center space-x-2">
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${
                  target ? getApexDomain(target) : SHORT_DOMAIN
                }`}
                alt={slug}
                className="h-5 w-5 rounded-full"
                width={20}
                height={20}
              />
              <p className="w-32 truncate text-left text-sm font-semibold text-gray-500">
                {slug}
              </p>
            </div>
            {domain === slug && !key && <Tick className="h-4 w-4" />}
          </Link>
        ))}
      </div>
    </div>
  );
};
