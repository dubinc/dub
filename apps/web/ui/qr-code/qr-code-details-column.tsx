import useWorkspace from "@/lib/swr/use-workspace";
import { QrCodeControls } from "@/ui/qr-code/qr-code-controls.tsx";
import { NewResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList, CursorRays, Tooltip, useMediaQuery } from "@dub/ui";
import { ReferredVia } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  INFINITY_NUMBER,
  nFormatter,
  pluralize,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import { useContext, useMemo, useRef, useState } from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";

export function QrCodeDetailsColumn({ qrCode }: { qrCode: NewResponseQrCode }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="flex items-center justify-end gap-2">
      <AnalyticsBadge qrCode={qrCode} />

      <QrCodeControls qrCode={qrCode} />
    </div>
  );
}

function AnalyticsBadge({ qrCode }: { qrCode: NewResponseQrCode }) {
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

  // Hacky fix for making sure the tooltip closes (by rerendering) when the modal opens
  const [modalShowCount, setModalShowCount] = useState(0);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "ml-2 flex w-[58px] justify-center overflow-hidden rounded-md border border-neutral-200/10",
          "bg-neutral-50 p-0.5 px-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-100",
          qrCode.link.archived
            ? "bg-red-100 text-red-600"
            : "bg-green-100 text-neutral-600",
        )}
      >
        {qrCode.link.archived ? "Paused" : "Active"}
      </div>
      {isMobile ? (
        <Link
          href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
          className="flex items-center gap-1 rounded-md border border-neutral-200/10 bg-neutral-50 px-2 py-0.5 text-sm text-neutral-800"
        >
          <CursorRays className="h-4 w-4 text-neutral-600" />
          {nFormatter(qrCode.link.clicks)}
        </Link>
      ) : (
        <>
          <ShareDashboardModal />
          <Tooltip
            key={modalShowCount}
            side="top"
            content={
              <div className="flex flex-col gap-2.5 whitespace-nowrap p-3 text-neutral-600">
                {stats.map(({ id: tab, value }) => (
                  <div key={tab} className="text-sm leading-none">
                    <span className="font-medium text-neutral-950">
                      {tab === "sales"
                        ? currencyFormatter(value / 100)
                        : nFormatter(value, { full: value < INFINITY_NUMBER })}
                    </span>{" "}
                    {tab === "sales" ? "total " : ""}
                    {pluralize(tab.slice(0, -1), value)}
                  </div>
                ))}
                <p className="text-xs leading-none text-neutral-400">
                  {qrCode.link.lastClicked
                    ? `Last clicked ${timeAgo(qrCode.link.lastClicked, {
                        withAgo: true,
                      })}`
                    : "No clicks yet"}
                </p>
              </div>
            }
          >
            <Link
              href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
              className={cn(
                "overflow-hidden rounded-md border border-neutral-200/10 bg-neutral-50 p-0.5 text-sm text-neutral-600 transition-colors",
                variant === "loose" ? "hover:bg-neutral-100" : "hover:bg-white",
              )}
            >
              <div className="hidden items-center gap-0.5 sm:flex">
                {stats.map(({ id: tab, value }) => (
                  <div
                    key={tab}
                    className="flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-px transition-colors"
                  >
                    <span>
                      {tab === "sales"
                        ? currencyFormatter(value / 100)
                        : nFormatter(value)}
                      {stats.length === 1 && " scans"}
                    </span>
                  </div>
                ))}
                {qrCode.link.dashboardId && (
                  <div className="border-l border-neutral-200/10 px-1.5">
                    <ReferredVia className="h-4 w-4 shrink-0 text-neutral-600" />
                  </div>
                )}
              </div>
            </Link>
          </Tooltip>
        </>
      )}
    </div>
  );
}
