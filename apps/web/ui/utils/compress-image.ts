export async function compressImage(
  base64Data: string,
  targetWidth: number = 38,
  targetHeight: number = 38,
  quality: number = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = `data:image/jpeg;base64,${base64Data}`;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          quality,
        );
      } catch (error) {
        reject(error);
      }
    };
  });
}

export type TCompressedImageFile = File & {
  isThumbnail: boolean;
  fileId: string;
  originalFileName: string;
  originalFileSize: number;
  uploadStatus: "success";
  uploadProgress: number;
};

export function createCompressedImageFile(
  blob: Blob,
  fileName: string,
  fileId: string,
  originalFileSize: number,
): TCompressedImageFile {
  const file = new File([blob], `${fileName}_preview.jpg`, {
    type: "image/jpeg",
  });

  return Object.assign(file, {
    isThumbnail: true,
    fileId: fileId,
    originalFileName: fileName,
    originalFileSize: originalFileSize,
    uploadStatus: "success",
    uploadProgress: 100,
  }) as TCompressedImageFile;
}
