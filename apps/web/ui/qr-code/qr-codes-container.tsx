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
    if (!qrs) return;

    setQrsWithPreviews(qrs);

    const timeoutId = setTimeout(() => {
      compressImagesInBackground(qrs);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [qrs]);

  const compressImagesInBackground = async (qrs: ResponseQrCode[]) => {
    try {
      const updatedQrs = await Promise.all(
        qrs.map(async (qr) => {
          const { qrType, fileId, fileName } = qr;

          if (!fileId || !fileName) return { ...qr };

          if (qrType === "image") return await handleImageCompression(qr);
          if (qrType === "pdf" || qrType === "video")
            return handleMediaPlaceholder(qr);

          return { ...qr };
        }),
      );

      setQrsWithPreviews(updatedQrs);
    } catch (error) {
      console.error("Error compressing images:", error);
    }
  };

  const handleImageCompression = async (qr: ResponseQrCode) => {
    try {
      const result = await getFileContent(qr.fileId!);
      if (!result.success) return { ...qr };

      const compressedBlob = await compressImage(result.data);
      const compressedFile = createCompressedImageFile(
        compressedBlob,
        qr.fileName!,
        qr.fileId!,
        qr.fileSize || 0,
      );

      return {
        ...qr,
        initialInputValues: {
          filesImage: [compressedFile],
        },
      };
    } catch (error) {
      console.warn(`Failed to compress image for QR ${qr.id}:`, error);
      return { ...qr };
    }
  };

  const handleMediaPlaceholder = (qr: ResponseQrCode) => {
    const typeMap = {
      pdf: "application/pdf",
      video: "video/mp4",
    };

    const placeholderFile = new File([""], qr.fileName!, {
      type: typeMap[qr.qrType],
    });

    Object.assign(placeholderFile, {
      isThumbnail: true,
      fileId: qr.fileId,
      originalFileName: qr.fileName,
      originalFileSize: qr.fileSize,
    });

    return {
      ...qr,
      initialInputValues: {
        [qr.qrType === "pdf" ? "filesPDF" : "filesVideo"]: [placeholderFile],
      },
    };
  };

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
