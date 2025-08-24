import useWorkspace from "@/lib/swr/use-workspace.ts";
import { useShareDashboardModal } from "@/ui/modals/share-dashboard-modal.tsx";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { CardList, CursorRays, useMediaQuery } from "@dub/ui";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useContext, useMemo } from "react";

export function QRCardAnalyticsBadge({
  qrCode,
  className,
}: {
  qrCode: QrStorageData;
  className?: string;
}) {
  const { slug, plan } = useWorkspace();
  const { domain, key, clicks } = qrCode.link;

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
    ],
    [qrCode.link],
  );

  const { ShareDashboardModal, setShowShareDashboardModal } =
    useShareDashboardModal({ domain, _key: key });

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 md:flex-row lg:w-[130px] lg:gap-4 xl:gap-6",
        className,
      )}
    >
      {isMobile ? (
        <Link
          href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
          className="bg-secondary-100 text-secondary flex w-full min-w-[91.5px] items-center justify-center gap-2 rounded-md border px-2 py-0.5 text-sm md:h-full md:gap-1"
        >
          {/*<CursorRays className="h-4 w-4 text-neutral-600" />*/}
          <Icon
            icon="streamline:graph"
            className="text-secondary h-[14px] w-[14px]"
          />
          {nFormatter(qrCode.link.clicks)} scans
        </Link>
      ) : (
        <>
          <ShareDashboardModal />

          <Link
            href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
            className={cn(
              "bg-secondary-100 text-secondary w-fit overflow-hidden rounded-md border border-neutral-200/10 p-0.5 text-sm transition-colors",
              variant === "loose" ? "hover:bg-neutral-100" : "hover:bg-white",
            )}
          >
            <div className="hidden items-center gap-0.5 sm:flex">
              {stats.map(({ id: tab, value }) => (
                <div
                  key={tab}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-1 py-px transition-colors",
                  )}
                >
                  <Icon
                    icon="streamline:graph"
                    className="text-secondary h-[14px] w-[14px]"
                  />
                  <span>
                    {tab === "sales"
                      ? currencyFormatter(value / 100)
                      : nFormatter(value)}
                    {stats.length === 1 && " scans"}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
