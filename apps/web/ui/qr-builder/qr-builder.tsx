import { useMediaQuery } from "@dub/ui";
import { forwardRef } from "react";
import { FILE_QR_TYPES, QR_TYPES } from "./constants/get-qr-config.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";
import { QrConfigTypeTabsMobile } from "./qr-config-type-tabs.mobile.tsx";
import { QrTypeTabs } from "./qr-type-tabs.tsx";

export const QrBuilder = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

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
