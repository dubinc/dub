import { useMediaQuery } from "@dub/ui";
import { forwardRef, useEffect } from "react";
import { FILE_QR_TYPES, QR_TYPES } from "./constants/get-qr-config.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";
import { QrConfigTypeTabsMobile } from "./qr-config-type-tabs.mobile.tsx";
import { QrTypeTabs } from "./qr-type-tabs.tsx";

export const QrBuilder = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

  useEffect(() => {
    if (!isMobile) return;

    const handleFocusOut = (e: Event) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        setTimeout(() => {
          if (
            !document.activeElement ||
            document.activeElement === document.body
          ) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }, 150);
      }
    };

    document.body.addEventListener("focusout", handleFocusOut);

    return () => {
      document.body.removeEventListener("focusout", handleFocusOut);
    };
  }, [isMobile]);

  const {
    options,
    qrCode,
    uploadedLogo,
    selectedSuggestedLogo,
    selectedSuggestedFrame,
    handlers,
    setData,
    isQrDisabled,
  } = useQrCustomization();

  const nonFileQrTypes = QR_TYPES.filter(
    (qrType) => !FILE_QR_TYPES.includes(qrType.id),
  );

  return isMobile ? (
    <QrConfigTypeTabsMobile
      options={options}
      qrCode={qrCode}
      uploadedLogo={uploadedLogo}
      selectedSuggestedLogo={selectedSuggestedLogo}
      selectedSuggestedFrame={selectedSuggestedFrame}
      handlers={handlers}
      setData={setData}
      isQrDisabled={isQrDisabled}
      nonFileQrTypes={nonFileQrTypes}
    />
  ) : (
    <QrTypeTabs
      options={options}
      qrCode={qrCode}
      uploadedLogo={uploadedLogo}
      selectedSuggestedLogo={selectedSuggestedLogo}
      selectedSuggestedFrame={selectedSuggestedFrame}
      handlers={handlers}
      setData={setData}
      isQrDisabled={isQrDisabled}
      nonFileQrTypes={nonFileQrTypes}
    />
  );
});
