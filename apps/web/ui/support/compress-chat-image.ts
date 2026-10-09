const CHAT_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const MAX_CHAT_IMAGES = 3;

const MAX_LONG_EDGE = 1568;
const TARGET_MAX_BYTES = 400 * 1024;
const MAX_DATA_URL_LENGTH = 1_400_000;
const JPEG_QUALITIES = [0.8, 0.6, 0.4];

export function isChatImageFile(file: File) {
  return CHAT_IMAGE_TYPES.has(file.type);
}

export async function compressChatImage(file: File) {
  if (!isChatImageFile(file)) {
    throw new Error("Please attach a PNG, JPEG, or WebP image.");
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image. Try PNG or JPEG."));
    };
    image.src = url;
  });

  const needsResize = Math.max(img.width, img.height) > MAX_LONG_EDGE;
  const needsCompress = file.size > TARGET_MAX_BYTES;

  if (!needsResize && !needsCompress) {
    const dataUrl = await blobToDataUrl(file);
    assertDataUrlFits(dataUrl);
    return {
      filename: file.name || "screenshot.png",
      mediaType: file.type,
      dataUrl,
    };
  }

  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image. Try a different PNG or JPEG.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  let blob: Blob | undefined;
  for (const quality of JPEG_QUALITIES) {
    blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= TARGET_MAX_BYTES) break;
  }

  if (!blob) {
    throw new Error("Could not process image. Try a different PNG or JPEG.");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "screenshot";
  const dataUrl = await blobToDataUrl(blob);
  assertDataUrlFits(dataUrl);

  return {
    filename: `${base}.jpg`,
    mediaType: "image/jpeg",
    dataUrl,
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else
          reject(
            new Error("Could not process image. Try a different PNG or JPEG."),
          );
      },
      "image/jpeg",
      quality,
    );
  });
}

function assertDataUrlFits(dataUrl: string) {
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("Image too large. Try a smaller screenshot.");
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}
