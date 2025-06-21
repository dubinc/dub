"use client";

import { getFileContent } from "@/lib/actions/get-file-content.ts";
import useQrs from "@/lib/swr/use-qrs.ts";
import { ExpandedLinkProps, QRProps, UserProps } from "@/lib/types";
import QrCodeCardPlaceholder from "@/ui/qr-code/qr-code-card-placeholder.tsx";
import { QrCodesDisplayContext } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import {
  compressImage,
  createCompressedImageFile,
} from "@/ui/utils/compress-image.ts";
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

  // State to hold QRs with preloaded previews
  const [qrsWithPreviews, setQrsWithPreviews] = useState<
    ResponseQrCode[] | undefined
  >(undefined);

  useEffect(() => {
    if (!qrs) {
      return;
    }

    setQrsWithPreviews(qrs);

    const compressImagesInBackground = async () => {
      try {
        const updatedQrs = await Promise.all(
          qrs.map(async (qr) => {
            if (qr.qrType === "image" && qr.fileId && qr.fileName) {
              try {
                const imageResult = await getFileContent(qr.fileId);
                if (imageResult.success) {
                  const compressedBlob = await compressImage(imageResult.data);
                  const compressedFile = createCompressedImageFile(
                    compressedBlob,
                    qr.fileName,
                    qr.fileId,
                    qr.fileSize || 0,
                  );

                  (qr as any).initialInputValues = {
                    filesImage: [compressedFile],
                  };
                }
              } catch (error) {
                console.warn(
                  `Failed to compress image for QR ${qr.id}:`,
                  error,
                );
              }
            } else if (
              (qr.qrType === "pdf" || qr.qrType === "video") &&
              qr.fileId &&
              qr.fileName
            ) {
              // Create a placeholder file object for preview in QRContentEditorModal
              const placeholderFile = new File([""], qr.fileName, {
                type: qr.qrType === "pdf" ? "application/pdf" : "video/mp4",
              });

              (placeholderFile as any).isThumbnail = true;
              (placeholderFile as any).fileId = qr.fileId;
              (placeholderFile as any).originalFileName = qr.fileName;
              (placeholderFile as any).originalFileSize = qr.fileSize;

              if (qr.qrType === "pdf") {
                (qr as any).initialInputValues = {
                  filesPDF: [placeholderFile],
                };
              } else if (qr.qrType === "video") {
                (qr as any).initialInputValues = {
                  filesVideo: [placeholderFile],
                };
              }
            }

            return { ...qr };
          }),
        );

        setQrsWithPreviews(updatedQrs);
      } catch (error) {
        console.error("Error compressing images:", error);
      }
    };

    setTimeout(compressImagesInBackground, 100);
  }, [qrs]);

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <QrCodesList
        CreateQrCodeButton={CreateQrCodeButton}
        qrCodes={qrsWithPreviews}
        loading={isValidating || (qrs && !qrsWithPreviews)}
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
