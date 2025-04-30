import { QRBuilderData } from "@/ui/modals/qr-builder";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { ArrowTurnLeft, Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { FC, forwardRef, Ref } from "react";
import { FILE_QR_TYPES, QR_TYPES } from "./constants/get-qr-config.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";
import { QrConfigTypeTabsMobile } from "./qr-config-type-tabs.mobile.tsx";
import { QrTypeTabs } from "./qr-type-tabs.tsx";

interface IQRBuilderProps {
  props?: ResponseQrCode;
  homepageDemo?: boolean;
  handleSaveQR?: (data: QRBuilderData) => void;
  isProcessing?: boolean;
  isEdit?: boolean;
}

export const QrBuilder: FC<IQRBuilderProps & { ref?: Ref<HTMLDivElement> }> =
  forwardRef(
    ({ props, homepageDemo, handleSaveQR, isProcessing, isEdit }, ref) => {
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
        initialInputValues,
      } = useQrCustomization(props);

      const nonFileQrTypes = QR_TYPES.filter(
        (qrType) => !FILE_QR_TYPES.includes(qrType.id),
      );

      const onSaveClick = () =>
        handleSaveQR?.({
          styles: options,
          frameOptions: {
            id: selectedSuggestedFrame,
          },
          qrType: qrTypeActiveTab,
        });

      return (
        <>
          <div
            className={cn(
              "h-full w-full transition-[height] duration-[300ms]",
              {
                "md:max-h-[600px] md:overflow-y-scroll": !homepageDemo,
              },
            )}
          >
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
                initialInputValues={initialInputValues}
                onRegistrationClick={onSaveClick}
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
                initialInputValues={initialInputValues}
                onRegistrationClick={onSaveClick}
              />
            )}
          </div>
          {!homepageDemo && (
            <div className="-mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 p-4">
              <Button
                disabled={isProcessing}
                loading={isProcessing}
                text={
                  <span className="flex items-center gap-2">
                    {isEdit ? "Save changes" : "Create QR"}
                    <div className="rounded border border-white/20 p-1">
                      <ArrowTurnLeft className="size-3.5" />
                    </div>
                  </span>
                }
                className="h-8 w-fit pl-2.5 pr-1.5"
                onClick={onSaveClick}
              />
            </div>
          )}
        </>
      );
    },
  );
