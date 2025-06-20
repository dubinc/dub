"use client";

import { getFileContent } from "@/lib/actions/get-file-content.ts";
import useQrs from "@/lib/swr/use-qrs.ts";
import { ExpandedLinkProps, QRProps, UserProps } from "@/lib/types";
import QrCodeCardPlaceholder from "@/ui/qr-code/qr-code-card-placeholder.tsx";
import { QrCodesDisplayContext } from "@/ui/qr-code/qr-codes-display-provider.tsx";
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

export type ResponseQrCode = QRProps & {
  user: UserProps;
  link: ExpandedLinkProps;
};

export default function QrCodesContainer({
  CreateQrCodeButton,
  isTrialOver = false,
}: {
  CreateQrCodeButton: () => ReactNode;
  isTrialOver?: boolean;
}) {
  const {
    viewMode,
    sortBy,
    // showArchived
  } = useContext(QrCodesDisplayContext);

  const { qrs, isValidating } = useQrs({ sortBy, showArchived: true });

  // State to hold QRs with preloaded thumbnails
  const [qrsWithThumbnails, setQrsWithThumbnails] = useState<
    ResponseQrCode[] | undefined
  >(undefined);

  useEffect(() => {
    if (!qrs) {
      return;
    }

    async function preloadThumbnails() {
      if (!qrs) return;

      const updatedQrs = await Promise.all(
        qrs.map(async (qr) => {
          if (
            (qr.qrType === "image" || qr.qrType === "video") &&
            qr.thumbnailFileId
          ) {
            try {
              const thumbnailResult = await getFileContent(qr.thumbnailFileId);

              if (thumbnailResult.success) {
                const { content, contentType } = thumbnailResult.data;
                const binaryString = atob(content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const thumbnailFile = new File(
                  [bytes],
                  `${qr.fileName || "file"}_thumb.jpg`,
                  { type: contentType },
                );

                (thumbnailFile as any).isThumbnail = true;
                (thumbnailFile as any).thumbnailFileId = qr.thumbnailFileId;
                (thumbnailFile as any).originalFileId = qr.fileId;
                (thumbnailFile as any).originalFileName = qr.fileName;

                if (qr.qrType === "image") {
                  (qr as any).initialInputValues = {
                    filesImage: [thumbnailFile],
                  };
                } else if (qr.qrType === "video") {
                  (qr as any).initialInputValues = {
                    filesVideo: [thumbnailFile],
                  };
                }
              }
            } catch (error) {
              console.warn(
                `Failed to preload thumbnail for QR ${qr.id}:`,
                error,
              );
            }
          }

          return { ...qr };
        }),
      );
      setQrsWithThumbnails(updatedQrs);
    }
    preloadThumbnails();
  }, [qrs]);

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <QrCodesList
        CreateQrCodeButton={CreateQrCodeButton}
        qrCodes={qrsWithThumbnails}
        loading={isValidating || (qrs && !qrsWithThumbnails)}
        compact={viewMode === "rows"}
        isTrialOver={isTrialOver}
      />
    </MaxWidthWrapper>
  );
}

export const QrCodesListContext = createContext<{
  openMenuQrCodeId: string | null;
  setOpenMenuQrCodeId: Dispatch<SetStateAction<string | null>>;
  isTrialOver?: boolean;
}>({
  openMenuQrCodeId: null,
  setOpenMenuQrCodeId: () => {},
  isTrialOver: false,
});

function QrCodesList({
  CreateQrCodeButton,
  qrCodes,
  // count,
  loading,
  compact,
  isTrialOver = false,
}: {
  CreateQrCodeButton: () => ReactNode;
  qrCodes?: ResponseQrCode[];
  count?: number;
  loading?: boolean;
  compact: boolean;
  isTrialOver?: boolean;
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
          value={{ openMenuQrCodeId, setOpenMenuQrCodeId, isTrialOver }}
        >
          {/* Cards */}
          <CardList variant={compact ? "compact" : "loose"} loading={loading}>
            {qrCodes?.length
              ? // Link cards
                qrCodes.map((qrCode) => (
                  <QrCodeCard key={qrCode.id} qrCode={qrCode} />
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
