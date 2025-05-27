import useWorkspace from "@/lib/swr/use-workspace";
import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QrCodeControls } from "@/ui/qr-code/qr-code-controls.tsx";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList, CursorRays, useMediaQuery } from "@dub/ui";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import { Icon } from "@iconify/react";
import { Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { RefObject, useContext, useMemo, useRef } from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";

interface QrCodeDetailsColumnProps {
  qrCode: ResponseQrCode;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentQrTypeInfo: QRType;
}

export function QrCodeDetailsColumn({
  qrCode,
  canvasRef,
  currentQrTypeInfo,
}: QrCodeDetailsColumnProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex h-full items-start justify-end gap-6 md:items-center"
    >
      <div className="hidden md:flex">
        <AnalyticsBadge qrCode={qrCode} currentQrTypeInfo={currentQrTypeInfo} />
      </div>

      <QrCodeControls qrCode={qrCode} canvasRef={canvasRef} />
    </div>
  );
}

export function AnalyticsBadge({
  qrCode,
  currentQrTypeInfo,
}: {
  qrCode: ResponseQrCode;
  currentQrTypeInfo: QRType;
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
      // show leads and sales if:
      // 1. link has trackConversion enabled
      // 2. link has leads or sales
      // ...(trackConversion || leads > 0 || saleAmount > 0
      //   ? [
      //       {
      //         id: "leads",
      //         icon: UserCheck,
      //         value: leads,
      //         className: "hidden sm:flex",
      //         iconClassName: "data-[active=true]:text-purple-500",
      //       },
      //       {
      //         id: "sales",
      //         icon: InvoiceDollar,
      //         value: saleAmount,
      //         className: "hidden sm:flex",
      //         iconClassName: "data-[active=true]:text-teal-500",
      //       },
      //     ]
      //   : []),
    ],
    [qrCode.link],
  );

  const { ShareDashboardModal, setShowShareDashboardModal } =
    useShareDashboardModal({ domain, _key: key });

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row lg:gap-4 xl:gap-6">
      {!isMobile && (
        // <div
        //   className={cn(
        //     "flex w-fit min-w-[58px] justify-center overflow-hidden rounded-md border border-neutral-200/10",
        //     "bg-neutral-50 p-0.5 px-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-100",
        //     qrCode.link.archived
        //       ? "bg-red-100 text-red-600"
        //       : "bg-green-100 text-neutral-600",
        //   )}
        // >
        //   {qrCode.link.archived ? "Deactivated" : "Active"}
        // </div>
        <Flex direction="row" gap="1" align="center" justify="center">
          <Icon
            icon={currentQrTypeInfo!.icon!}
            className="text-secondary text-lg"
          />
          <Text as="span" size="2" weight="bold" className="text-secondary">
            {currentQrTypeInfo!.label!}
          </Text>
        </Flex>
      )}
      {isMobile ? (
        <Link
          href={`/${slug}/analytics?domain=${domain}&key=${key}&interval=${plan === "free" ? "30d" : plan === "pro" ? "1y" : "all"}`}
          className="bg-secondary-100 text-secondary flex h-[26px] w-full min-w-[91.5px] items-center justify-center gap-2 rounded-md border px-2 py-0.5 text-sm md:h-full md:gap-1"
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
