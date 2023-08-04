import { useRouter } from "next/router";
import { useContext, useMemo, useState } from "react";
import { Copy, Tick } from "@/components/shared/icons";
import { Calendar, Share2, ChevronDown, Lock } from "lucide-react";
import { ExpandingArrow } from "#/ui/icons";
import { INTERVALS } from "#/lib/stats";
import useScroll from "#/lib/hooks/use-scroll";
import { cn, linkConstructor } from "#/lib/utils";
import IconMenu from "@/components/shared/icon-menu";
import Popover from "#/ui/popover";
import useSWR, { mutate } from "swr";
import { fetcher } from "#/lib/utils";
import { toast } from "sonner";
import Switch from "#/ui/switch";
import { StatsContext } from ".";
import useProject from "#/lib/swr/use-project";
import Tooltip, { TooltipContent } from "#/ui/tooltip";
import { ModalContext } from "#/ui/modal-provider";
import punycode from "punycode/";

export default function Toggle() {
  const router = useRouter();
  const { slug: projectSlug } = router.query as { slug?: string };

  const { basePath, domain, interval, key, modal } = useContext(StatsContext);
  const { setShowAddProjectModal, setShowUpgradePlanModal } =
    useContext(ModalContext);

  const [openDatePopover, setOpenDatePopover] = useState(false);

  const selectedInterval = useMemo(() => {
    return INTERVALS.find((s) => s.slug === interval) || INTERVALS[1];
  }, [interval]);

  const { plan } = useProject();
  const scrolled = useScroll(80);

  return (
    <div
      className={cn("sticky top-[6.95rem] z-10 mb-5 bg-gray-50 py-3 md:py-5", {
        "top-14": basePath.startsWith("/stats"),
        "top-6": modal,
        "shadow-md": scrolled && !modal,
      })}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between space-y-3 px-2.5 sm:flex-row sm:space-y-0 lg:px-0">
        <a
          className="group flex text-lg font-semibold text-gray-800 sm:text-xl"
          href={linkConstructor({ key, domain })}
          target="_blank"
          rel="noreferrer"
        >
          {linkConstructor({
            key,
            domain: punycode.toUnicode(domain),
            pretty: true,
          })}
          <ExpandingArrow className="h-5 w-5" />
        </a>
        <div className="flex items-center">
          {!basePath.startsWith("/stats") && key !== "_root" && (
            <SharePopover />
          )}
          <Popover
            content={
              <div className="grid w-full p-2 md:w-48">
                {INTERVALS.map(({ display, slug }) =>
                  (slug === "all" || slug === "90d") &&
                  (!plan || plan === "free") ? (
                    <Tooltip
                      key={slug}
                      content={
                        <TooltipContent
                          title={
                            projectSlug
                              ? `${display} stats can only be viewed on a Pro plan or higher. Upgrade now to view all-time stats.`
                              : `${display} stats can only be viewed on a project with a Pro plan or higher. Create a project or navigate to an existing project to upgrade.`
                          }
                          cta={
                            projectSlug ? "Upgrade to Pro" : "Create Project"
                          }
                          onClick={() => {
                            setOpenDatePopover(false);
                            if (projectSlug) {
                              setShowUpgradePlanModal(true);
                            } else {
                              setShowAddProjectModal(true);
                            }
                          }}
                        />
                      }
                    >
                      <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                        <p>{display}</p>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </Tooltip>
                  ) : (
                    <button
                      key={slug}
                      onClick={() => {
                        router.push(
                          {
                            query: {
                              ...router.query,
                              interval: slug,
                            },
                          },
                          `${basePath}?interval=${slug}`,
                          { shallow: true },
                        );
                      }}
                      className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <p className="text-sm">{display}</p>
                      {selectedInterval.slug === slug && (
                        <Tick className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  ),
                )}
              </div>
            }
            openPopover={openDatePopover}
            setOpenPopover={setOpenDatePopover}
          >
            <button
              onClick={() => setOpenDatePopover(!openDatePopover)}
              className="flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 sm:w-48"
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

const SharePopover = () => {
  const router = useRouter();
  const { key } = router.query as {
    key: string;
  };

  const [openSharePopover, setopenSharePopoverPopover] = useState(false);

  const { endpoint, domain, queryString } = useContext(StatsContext);

  const { data: { publicStats } = {} } = useSWR<{ publicStats: boolean }>(
    `${endpoint}${queryString}`,
    fetcher,
  );

  const [updating, setUpdating] = useState(false);

  const handleChange = async () => {
    toast.promise(
      new Promise<void>(async (resolve) => {
        setUpdating(true);
        const res = await fetch(`${endpoint}${queryString}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicStats: !publicStats,
          }),
        });
        if (res.status === 200) {
          mutate(`${endpoint}${queryString}`);
          !publicStats &&
            navigator.clipboard.writeText(
              `https://${domain}/stats/${encodeURIComponent(key)}`,
            );
          // artificial delay to sync toast with the switch change
          await new Promise((r) => setTimeout(r, 200));
        }
        setUpdating(false);
        resolve();
      }),
      {
        loading: "Updating...",
        success: `Stats page is now ${
          publicStats ? "private." : "public. Link copied to clipboard."
        }`,
        error: "Something went wrong",
      },
    );
  };
  const [copied, setCopied] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-gray-200 text-sm sm:w-60">
          <div className="p-4">
            <p className="text-gray-500">Share stats for</p>
            <p className="truncate font-semibold text-gray-800">
              {linkConstructor({ key, domain, pretty: true })}
            </p>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-gray-800">Public Stats Page</p>
              <Switch
                checked={publicStats}
                fn={handleChange}
                disabled={updating}
              />
            </div>
            <p className="text-gray-500">
              Making stats public will allow anyone with the link to see the
              stats for this short link.
            </p>
          </div>
          <div className="p-4">
            <p className="font-semibold text-gray-800">Share Link</p>
            <div className="divide-x-200 mt-2 flex items-center justify-between divide-x overflow-hidden rounded-md border border-gray-200 bg-gray-100">
              <div className="overflow-scroll pl-2 scrollbar-hide">
                <p className="whitespace-nowrap text-gray-600">
                  https://{domain}/stats/{encodeURIComponent(key)}
                </p>
              </div>
              <button
                className="h-8 flex-none border-l bg-white px-2 hover:bg-gray-50 active:bg-gray-100"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://${domain}/stats/${encodeURIComponent(key)}`,
                  );
                  setCopied(true);
                  toast.success("Copied to clipboard");
                  setTimeout(() => setCopied(false), 3000);
                }}
              >
                {copied ? (
                  <Tick className="h-4 w-4 text-gray-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      }
      align="end"
      openPopover={openSharePopover}
      setOpenPopover={setopenSharePopoverPopover}
    >
      <button
        onClick={() => setopenSharePopoverPopover(!openSharePopover)}
        className="mr-2 flex w-24 items-center justify-center space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95"
      >
        <IconMenu text="Share" icon={<Share2 className="h-4 w-4" />} />
      </button>
    </Popover>
  );
};
