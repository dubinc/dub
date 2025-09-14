"use client";

import useQrs from "@/lib/swr/use-qrs.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import QrCodeCardPlaceholder from "@/ui/qr-code/qr-code-card-placeholder.tsx";
import { QrCodesDisplayContext } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import { compressImagesInBackground } from "@/ui/utils/qr-code-previews.ts";
import { CardList, MaxWidthWrapper } from "@dub/ui";
import { CursorRays, QRCode as QRCodeIcon } from "@dub/ui/icons";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { QrCodeCard } from "./qr-code-card.tsx";

export default function QrCodesContainer({
  CreateQrCodeButton,
  featuresAccess,
  initialQrs,
}: {
  CreateQrCodeButton: () => ReactNode;
  featuresAccess: boolean;
  initialQrs: QrStorageData[];
}) {
  const {
    viewMode,
    sortBy,
    // showArchived
  } = useContext(QrCodesDisplayContext);

  const { qrs: clientQrs, isValidating } = useQrs({
    sortBy,
    showArchived: true,
  }, {}, false, true);

  const qrs = clientQrs || initialQrs;

  // State to hold QRs with preloaded previews
  const [qrsWithPreviews, setQrsWithPreviews] = useState<
    QrStorageData[] | undefined
  >(undefined);

  useEffect(() => {
    console.log("qrs", qrs);
    if (!qrs) return;

    setQrsWithPreviews(qrs);

    const timeoutId = setTimeout(async () => {
      const updatedQrs = await compressImagesInBackground(qrs);
      setQrsWithPreviews(updatedQrs);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [qrs]);

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <QrCodesList
        CreateQrCodeButton={CreateQrCodeButton}
        qrCodes={qrsWithPreviews}
        loading={isValidating || (qrs && !qrsWithPreviews)}
        compact={viewMode === "rows"}
        featuresAccess={featuresAccess}
      />
    </MaxWidthWrapper>
  );
}

export const QrCodesListContext = createContext<{
  openMenuQrCodeId: string | null;
  setOpenMenuQrCodeId: Dispatch<SetStateAction<string | null>>;
  featuresAccess: boolean;
}>({
  openMenuQrCodeId: null,
  setOpenMenuQrCodeId: () => {},
  featuresAccess: true,
});

function QrCodesList({
  CreateQrCodeButton,
  qrCodes,
  // count,
  loading,
  compact,
  featuresAccess,
}: {
  CreateQrCodeButton: () => ReactNode;
  qrCodes?: QrStorageData[];
  count?: number;
  loading?: boolean;
  compact: boolean;
  featuresAccess: boolean;
}) {
  const searchParams = useSearchParams();

  const [openMenuQrCodeId, setOpenMenuQrCodeId] = useState<string | null>(null);

  const isFiltered = [
    "folderId",
    "tagIds",
    "domain",
    "userId",
    "search",
    "showArchived",
  ].some((param) => searchParams.has(param));

  return (
    <>
      {!qrCodes || qrCodes.length ? (
        <QrCodesListContext.Provider
          value={{ openMenuQrCodeId, setOpenMenuQrCodeId, featuresAccess }}
        >
          {/* Cards */}
          <CardList variant={compact ? "compact" : "loose"} loading={loading}>
            {qrCodes?.length
              ? // Link cards
                qrCodes.map((qrCode) => (
                  <QrCodeCard key={qrCode.id} qrCode={qrCode} featuresAccess={featuresAccess} />
                ))
              : // Loading placeholder cards
                Array.from({ length: 12 }).map((_, idx) => (
                  <CardList.Card
                    key={idx}
                    outerClassName="pointer-events-none"
                    innerClassName="flex items-center gap-4"
                  >
                    <QrCodeCardPlaceholder />
                  </CardList.Card>
                ))}
          </CardList>
        </QrCodesListContext.Provider>
      ) : (
        <AnimatedEmptyState
          title={isFiltered ? "No QRs found" : "No QR codes yet"}
          description={
            isFiltered
              ? "Bummer! There are no QRs that match your filters. Adjust your filters to yield more results."
              : "Start creating customized QR codes for websites, PDFs, images, and more — all in one place."
          }
          cardContent={
            <>
              <QRCodeIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                <CursorRays className="size-3.5" />
              </div>
            </>
          }
          {...(!isFiltered && {
            addButton: (
              <div>
                <CreateQrCodeButton />
              </div>
            ),
          })}
        />
      )}
    </>
  );
}
