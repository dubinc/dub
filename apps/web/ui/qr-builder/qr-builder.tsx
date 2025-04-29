import { QRBuilderData } from "@/ui/modals/qr-builder";
import { NewResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { ArrowTurnLeft, Button, useMediaQuery } from "@dub/ui";
import { FC, forwardRef, Ref } from "react";
import { FILE_QR_TYPES, QR_TYPES } from "./constants/get-qr-config.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";
import { QrConfigTypeTabsMobile } from "./qr-config-type-tabs.mobile.tsx";
import { QrTypeTabs } from "./qr-type-tabs.tsx";

interface IQRBuilderProps {
  props?: NewResponseQrCode;
  homepageDemo?: boolean;
  handleSaveQR?: (data: QRBuilderData) => void;
}

export const QrBuilder: FC<IQRBuilderProps & { ref?: Ref<HTMLDivElement> }> =
  forwardRef(({ homepageDemo, handleSaveQR }, ref) => {
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
      selectedQRType: qrTypeActiveTab,
      setSelectedQRType: setQRTypeActiveTab,
    } = useQrCustomization();

    const nonFileQrTypes = QR_TYPES.filter(
      (qrType) => !FILE_QR_TYPES.includes(qrType.id),
    );

    return (
      <>
        {isMobile ? (
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
            homepageDemo={homepageDemo}
            qrTypeActiveTab={qrTypeActiveTab}
            setQRTypeActiveTab={setQRTypeActiveTab}
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
            homepageDemo={homepageDemo}
            qrTypeActiveTab={qrTypeActiveTab}
            setQRTypeActiveTab={setQRTypeActiveTab}
          />
        )}
        {!homepageDemo && (
          <div className="-mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 p-4">
            <Button
              // disabled={saveDisabled}
              // loading={isSubmitting || isSubmitSuccessful}
              text={
                <span className="flex items-center gap-2">
                  Create QR
                  <div className="rounded border border-white/20 p-1">
                    <ArrowTurnLeft className="size-3.5" />
                  </div>
                </span>
              }
              className="h-8 w-fit pl-2.5 pr-1.5"
              onClick={() =>
                handleSaveQR?.({
                  options,
                  frameOptions: {
                    id: selectedSuggestedFrame,
                  },
                  getQRType: qrTypeActiveTab,
                })
              }
            />
          </div>
        )}
      </>
    );
  });
