import { getFileContent } from "@/lib/actions/get-file-content.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import {
  compressImage,
  createCompressedImageFile,
} from "@/ui/utils/compress-image.ts";

export const compressImagesInBackground = async (qrs: QrStorageData[]) => {
  try {
    const updatedQrs = await Promise.all(
      qrs.map(async (qr) => {
        const { qrType, fileId, file } = qr;
        const fileName = file?.name;

        if (!fileId || !fileName) return { ...qr };

        if (qrType === "image") return await handleImageCompression(qr);
        if (qrType === "pdf" || qrType === "video")
          return handleMediaPlaceholder(qr);

        return { ...qr };
      }),
    );
    return updatedQrs;
  } catch (error) {
    console.error("Error compressing images:", error);
    return qrs;
  }
};

const handleImageCompression = async (qr: QrStorageData) => {
  try {
    const result = await getFileContent(qr.fileId!);
    if (!result.success) return { ...qr };

    const compressedBlob = await compressImage(result.data);
    const compressedFile = createCompressedImageFile(
      compressedBlob,
      qr.file?.name!,
      qr.fileId!,
      qr.file?.size || 0,
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

const handleMediaPlaceholder = (qr: QrStorageData) => {
  const typeMap = {
    pdf: "application/pdf",
    video: "video/mp4",
  };

  const placeholderFile = new File([""], qr.file?.name!, {
    type: typeMap[qr.qrType],
  });

  Object.assign(placeholderFile, {
    isThumbnail: true,
    fileId: qr.fileId,
    originalFileName: qr.file?.name,
    originalFileSize: qr.file?.size,
  });

  return {
    ...qr,
    initialInputValues: {
      [qr.qrType === "pdf" ? "filesPDF" : "filesVideo"]: [placeholderFile],
    },
  };
};
