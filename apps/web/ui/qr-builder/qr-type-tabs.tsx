import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { QrTabsCustomization } from "@/ui/qr-builder/qr-tabs-customization.tsx";
import { cn } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import * as Tabs from "@radix-ui/react-tabs";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { EQRType, QRType } from "./constants/get-qr-config.ts";
import { qrTypeDataHandlers } from "./helpers/qr-type-data-handlers.ts";
import { QRCanvas } from "./qr-canvas.tsx";
import { QrTabsDownloadButton } from "./qr-tabs-download-button.tsx";
import { QrTabsStepTitle } from "./qr-tabs-step-title.tsx";

interface QrTypeTabsProps {
  options: any;
  qrCode: any;
  uploadedLogo: File | null;
  selectedSuggestedLogo: string;
  selectedSuggestedFrame: string;
  handlers: any;
  setData: Dispatch<SetStateAction<any>>;
  isQrDisabled: boolean;
  nonFileQrTypes: QRType[];
}

export const QrTypeTabs = ({
  options,
  qrCode,
  uploadedLogo,
  selectedSuggestedLogo,
  selectedSuggestedFrame,
  handlers,
  setData,
  isQrDisabled,
  nonFileQrTypes,
}: QrTypeTabsProps) => {
  const [qrTypeActiveTab, setQRTypeActiveTab] = useState<EQRType>(
    EQRType.WEBSITE,
  );
  const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
    useState<string>("Frame");

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
      value={qrTypeActiveTab}
      onValueChange={setQRTypeActiveTab as (value: string) => void}
      className="border-border-500 mx-auto flex w-full flex-col items-center justify-center gap-[18px] rounded-lg border bg-white"
    >
      <Tabs.List className="border-b-border-500 flex w-full items-center justify-between gap-0.5 overflow-x-auto border-b p-3">
        {nonFileQrTypes.map((type, idx) => (
          <Tabs.Trigger
            key={type.id}
            value={type.id}
            className={cn(
              "text-neutral group flex min-w-32 items-center justify-center gap-2 rounded-md px-4 py-3.5 font-medium transition-colors",
              "hover:bg-border-100 hover:text-neutral",
              "data-[state=active]:bg-secondary-100 data-[state=active]:border-secondary data-[state=active]:text-secondary",
            )}
          >
            <Icon
              icon={type.icon}
              className={cn(
                "h-5 w-5 flex-none",
                idx === 1
                  ? "group-hover:[&>path]:fill-neutral [&>path]:fill-neutral-200"
                  : "group-hover:[&>g]:stroke-neutral group-hover:[&>path]:stroke-neutral [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                qrTypeActiveTab === type.id &&
                  (idx === 1
                    ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
                    : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
              )}
            />
            <span className="whitespace-nowrap text-base font-normal md:text-xs">
              {type.label}
            </span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {nonFileQrTypes.map((type) => {
        return (
          <Tabs.Content
            key={type.id}
            value={type.id}
            className={cn("w-full focus:outline-none")}
          >
            <div
              className={cn(
                "flex h-full w-full flex-row items-stretch justify-between gap-8 p-4",
              )}
            >
              <div className="flex basis-3/5 flex-col justify-start gap-2">
                <div className="border-b-border-400 flex flex-col items-start justify-start gap-4 border-b-2 pb-6">
                  <QrTabsStepTitle
                    stepNumber={1}
                    title={"Complete the content"}
                  />
                  <div className="w-full">
                    <QRCodeContentBuilder
                      qrType={type.id}
                      handleContent={handleContent}
                      minimalFlow
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-4 pt-4">
                  <QrTabsStepTitle stepNumber={2} title={"Customize your QR"} />
                  <QrTabsCustomization
                    styleOptionActiveTab={styleOptionActiveTab}
                    setStyleOptionActiveActiveTab={
                      setStyleOptionActiveActiveTab
                    }
                    selectedSuggestedFrame={selectedSuggestedFrame}
                    selectedSuggestedLogo={selectedSuggestedLogo}
                    uploadedLogo={uploadedLogo}
                    isQrDisabled={isQrDisabled}
                    isMobile={false}
                    options={options}
                    handlers={handlers}
                  />
                </div>
              </div>

              <div className="bg-background relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg p-6">
                <div className="sticky top-8 flex flex-col gap-6">
                  <QrTabsStepTitle stepNumber={3} title={"Download your QR"} />
                  <div
                    className={cn("flex justify-center rounded-lg shadow-lg", {
                      "opacity-30": isQrDisabled,
                    })}
                  >
                    <QRCanvas qrCode={qrCode} />
                    {/*<QRPreview qrCode={qrCode} />*/}
                  </div>
                  <QrTabsDownloadButton isQrDisabled={isQrDisabled} />
                </div>
              </div>
            </div>
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
};
