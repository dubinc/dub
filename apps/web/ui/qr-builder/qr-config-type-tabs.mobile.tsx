import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { QrTabsCustomization } from "@/ui/qr-builder/qr-tabs-customization.tsx";
import { cn } from "@dub/utils/src";
import * as Tabs from "@radix-ui/react-tabs";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import {
  EQRType,
  QRType,
  QR_GENERATION_STEPS,
} from "./constants/get-qr-config.ts";
import { qrTypeDataHandlers } from "./helpers/qr-type-data-handlers.ts";
import { QRPreview } from "./qr-preview.tsx";
import { QrTabsDownloadButton } from "./qr-tabs-download-button.tsx";
import { QRTabsPopover } from "./qr-tabs-popover.tsx";
import { QrTabsStepTitle } from "./qr-tabs-step-title.tsx";

interface QrConfigTypeTabsMobileProps {
  options: any;
  qrCode: any;
  uploadedLogo: File | null;
  selectedSuggestedLogo: string;
  selectedSuggestedFrame: string;
  handlers: any;
  setData: Dispatch<SetStateAction<any>>;
  isQrDisabled: boolean;
  nonFileQrTypes: QRType[];
  homepageDemo?: boolean;
  qrTypeActiveTab: QRType["id"];
  setQRTypeActiveTab: Dispatch<SetStateAction<QRType["id"]>>;
}

export const QrConfigTypeTabsMobile = ({
  options,
  qrCode,
  uploadedLogo,
  selectedSuggestedLogo,
  selectedSuggestedFrame,
  handlers,
  setData,
  isQrDisabled,
  nonFileQrTypes,
  homepageDemo,
  qrTypeActiveTab,
  setQRTypeActiveTab,
}: QrConfigTypeTabsMobileProps) => {
  const [openPopover, setOpenPopover] = useState<boolean>(false);

  const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
    useState<string>("Frame");
  const [mobileStepActiveTab, setMobileStepActiveTab] = useState<string>(
    QR_GENERATION_STEPS[0].id,
  );

  const handlePopoverItemClick = (tabId: EQRType) => {
    setQRTypeActiveTab(tabId);
    setOpenPopover(false);
  };

  const handleContent = useCallback(
    ({
      inputValues,
      isHiddenNetwork,
      qrType,
    }: {
      inputValues: Record<string, string>;
      files: File[];
      isHiddenNetwork: boolean;
      qrType: EQRType;
    }) => {
      setData(qrTypeDataHandlers[qrType](inputValues, isHiddenNetwork));
    },
    [setData],
  );

  return (
    <Tabs.Root
      value={mobileStepActiveTab}
      onValueChange={setMobileStepActiveTab}
      className="bg-background border-border-500 mx-auto flex w-full flex-col items-center justify-center gap-4 rounded-lg border p-4"
    >
      <div
        className={cn("flex justify-center rounded-lg shadow-lg", {
          "opacity-30": isQrDisabled,
        })}
      >
        <QRPreview qrCode={qrCode} />
      </div>

      <Tabs.List className="flex w-full rounded-md">
        {QR_GENERATION_STEPS.map((step) => (
          <Tabs.Trigger
            key={step.id}
            value={step.id}
            className={cn(
              "text-neutral border-b-border-300 group flex basis-1/2 items-center justify-center gap-2 border-b-[3px] px-3 py-2.5 font-medium",
              "transition-all duration-300 ease-in-out",
              "hover:bg-border-100 hover:text-neutral",
              "data-[state=active]:border-b-secondary data-[state=active]:text-secondary",
            )}
          >
            <QrTabsStepTitle title={step.label} isMobile={true} />
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {mobileStepActiveTab === "content" && (
        <Tabs.Content
          key={QR_GENERATION_STEPS[0].id}
          value={QR_GENERATION_STEPS[0].id}
          className="align-center flex w-full flex-col justify-center gap-6"
        >
          <QRTabsPopover
            qrTypes={nonFileQrTypes}
            setOpenPopover={setOpenPopover}
            openPopover={openPopover}
            handlePopoverItemClick={handlePopoverItemClick}
            isMobile={true}
            showButtonContent
            selectedQrType={nonFileQrTypes.find(
              (type) => type.id === qrTypeActiveTab,
            )}
          />

          <QRCodeContentBuilder
            qrType={qrTypeActiveTab}
            handleContent={handleContent}
            minimalFlow
          />
        </Tabs.Content>
      )}
      {mobileStepActiveTab === "design" && (
        <Tabs.Content
          key={QR_GENERATION_STEPS[1].id}
          className="flex w-full flex-col items-start justify-start gap-4"
          value={QR_GENERATION_STEPS[1].id}
        >
          <QrTabsCustomization
            styleOptionActiveTab={styleOptionActiveTab}
            setStyleOptionActiveActiveTab={setStyleOptionActiveActiveTab}
            selectedSuggestedFrame={selectedSuggestedFrame}
            selectedSuggestedLogo={selectedSuggestedLogo}
            uploadedLogo={uploadedLogo}
            isQrDisabled={isQrDisabled}
            isMobile={true}
            options={options}
            handlers={handlers}
          />
        </Tabs.Content>
      )}

      {homepageDemo && <QrTabsDownloadButton isQrDisabled={isQrDisabled} />}
    </Tabs.Root>
  );
};
