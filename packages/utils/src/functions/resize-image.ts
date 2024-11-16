export const resizeImage = (
  file: File,
  opts: {
    width: number;
    height: number;
    quality?: number;
  } = {
    width: 1200, // Desired output width
    height: 630, // Desired output height
    quality: 1.0, // Set quality to maximum
  },
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const targetWidth = opts.width;
        const targetHeight = opts.height;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        ctx.imageSmoothingQuality = "high"; // Set image smoothing quality to high

        // Calculating the aspect ratio
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const sourceAspectRatio = sourceWidth / sourceHeight;
        const targetAspectRatio = targetWidth / targetHeight;

        let drawWidth: number;
        let drawHeight: number;
        let offsetX = 0;
        let offsetY = 0;

        // Adjust drawing sizes based on the aspect ratio
        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider
          drawHeight = sourceHeight;
          drawWidth = sourceHeight * targetAspectRatio;
          offsetX = (sourceWidth - drawWidth) / 2;
        } else {
          // Source is taller or has the same aspect ratio
          drawWidth = sourceWidth;
          drawHeight = sourceWidth / targetAspectRatio;
          offsetY = (sourceHeight - drawHeight) / 2;
        }

        // Draw the image onto the canvas
        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );

        // Convert the canvas to a base64 string
        const base64Image = canvas.toDataURL("image/jpeg", opts.quality);
        resolve(base64Image);
      };
      img.onerror = (error) =>
        reject(new Error("Image loading error: " + error));
    };
    reader.onerror = (error) => reject(new Error("FileReader error: " + error));
    reader.readAsDataURL(file);
  });
};
