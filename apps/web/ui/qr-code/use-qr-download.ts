import QRCodeStyling from "qr-code-styling";

export const useQrDownload = (qrCode: QRCodeStyling | null) => {
  const downloadQrCode = async (format: "svg" | "png" | "jpg") => {
    if (!qrCode) return;

    if (format === "svg") {
      qrCode.download({
        extension: "svg",
        name: "qr-code",
      });
    } else {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 1024;
      tempCanvas.height = 1024;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

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
        const quality = format === "jpg" ? 0.9 : undefined;
        const dataUrl = tempCanvas.toDataURL(mimeType, quality);

        link.href = dataUrl;
        link.download = `qr-code.${format}`;
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
