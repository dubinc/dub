import QRCodeStyling from "qr-code-styling";

export type TDownloadFormat = "svg" | "png" | "jpg";

export const useQrDownload = (qrCode: QRCodeStyling | null) => {
  const downloadQrCode = async (format: TDownloadFormat) => {
    if (!qrCode) return;

    if (format === "svg") {
      qrCode.download({
        extension: "svg",
        name: "qr-code",
      });
    } else {
      const canvasSize = 2048;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const tempDiv = document.createElement("div");
      qrCode.append(tempDiv);
      const svg = tempDiv.querySelector("svg");
      if (!svg) {
        tempDiv.remove();
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (format === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const link = document.createElement("a");
        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const canvasQuality = 1;
        const dataUrl = tempCanvas.toDataURL(mimeType, canvasQuality);

        link.href = dataUrl;
        link.download = `qr-code-${canvasQuality}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        tempDiv.remove();
        URL.revokeObjectURL(img.src);
      };

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    }
  };

  return { downloadQrCode };
};
