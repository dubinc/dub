"use client";

import { QRCodeContentBuilder } from "@/ui/shared/qr-code-content-builder.tsx";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as Tabs from "@radix-ui/react-tabs";
import { forwardRef, useState } from "react";
import { QRPreview } from "../../../../(dashboard)/[slug]/new-qr/customization/components/qr-review.tsx";
import { useQrCustomization } from "../../../../(dashboard)/[slug]/new-qr/customization/hook/use-qr-customization.ts";
import {
  EQRType,
  FILE_QR_TYPES,
  QR_GENERATION_STEPS,
  QR_TYPES,
} from "../../constants/get-qr-config.ts";
import { Rating } from "../rating-info/components/rating.tsx";
import { QrTabsCustomization } from "./components/customization/qr-tabs-customization.tsx";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { QrTabsDownloadButton } from "./components/qr-tabs-download-button.tsx";
import { QRTabsPopover } from "./components/qr-tabs-popover.tsx";
import { QrTabsStepTitle } from "./components/qr-tabs-step-title.tsx";
import { QrTabsTitle } from "./components/qr-tabs-title.tsx";

export const QRTabs = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<EQRType>(EQRType.WEBSITE);
  const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
    useState<string>("Frame");
  const [stepActiveTab, setStepActiveTab] = useState<string>(
    QR_GENERATION_STEPS[0].id,
  );

  const handlePopoverItemClick = (tabId: EQRType) => {
    setActiveTab(tabId);
    setOpenPopover(false);
  };

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

  return (
    <section className="bg-primary-100 w-full px-3 pb-6 md:pb-12">
      <div className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-4 md:gap-12">
        <QrTabsTitle />
        {isMobile ? (
          <Tabs.Root
            ref={ref}
            value={stepActiveTab}
            onValueChange={setStepActiveTab}
            className="mx-auto flex w-full flex-col items-center justify-center gap-4 rounded-lg bg-white p-4"
          >
            <div
              className={cn("flex justify-center rounded-lg shadow-lg", {
                "opacity-30": isQrDisabled,
              })}
            >
              <QRPreview qrCode={qrCode} />
            </div>

            <Tabs.List className="flex w-full gap-3 p-3">
              {QR_GENERATION_STEPS.map((step, idx) => (
                <Tabs.Trigger
                  key={step.id}
                  value={step.id}
                  className={cn(
                    "text-neutral border-border-300 group flex basis-1/2 items-center justify-start gap-2 rounded-md border px-3 py-2.5 font-medium transition-colors",
                    "hover:bg-border-100 hover:text-neutral",
                    "data-[state=active]:bg-secondary-100 data-[state=active]:border-secondary data-[state=active]:text-secondary",
                  )}
                >
                  <QrTabsStepTitle title={step.label} stepNumber={idx + 1} />
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content
              value={QR_GENERATION_STEPS[0].id}
              className="align-center border-border-100 flex w-full flex-col justify-center gap-6 rounded-md border p-3"
            >
              <QRTabsPopover
                qrTypes={nonFileQrTypes}
                setOpenPopover={setOpenPopover}
                openPopover={openPopover}
                handlePopoverItemClick={handlePopoverItemClick}
                isMobile={isMobile}
                showButtonContent
                selectedQrType={nonFileQrTypes.find(
                  (type) => type.id === activeTab,
                )}
              />

              <QRCodeContentBuilder
                qrType={activeTab}
                handleContent={(data) => {
                  console.log(
                    "[setData]",
                    JSON.stringify(data),
                    data.inputValues["website-website-link"],
                  );
                  setData(data.inputValues["website-website-link"]);
                }}
                minimalFlow
              />
            </Tabs.Content>
            <Tabs.Content value={QR_GENERATION_STEPS[1].id}>
              <div className="flex flex-col items-start justify-start gap-4 pt-4">
                <QrTabsCustomization
                  styleOptionActiveTab={styleOptionActiveTab}
                  setStyleOptionActiveActiveTab={setStyleOptionActiveActiveTab}
                  selectedSuggestedFrame={selectedSuggestedFrame}
                  selectedSuggestedLogo={selectedSuggestedLogo}
                  uploadedLogo={uploadedLogo}
                  isQrDisabled={isQrDisabled}
                  isMobile={isMobile}
                  options={options}
                  handlers={handlers}
                />
              </div>
            </Tabs.Content>

            {isMobile && <QrTabsDownloadButton isQrDisabled={isQrDisabled} />}
          </Tabs.Root>
        ) : (
          <Tabs.Root
            ref={ref}
            value={activeTab}
            onValueChange={setActiveTab as (value: string) => void}
            className="mx-auto flex w-full flex-col items-center justify-center gap-[18px] rounded-lg bg-white p-4 md:rounded-none md:bg-transparent"
          >
            <Tabs.List className="flex w-full items-center justify-between gap-0.5 overflow-x-auto rounded-lg bg-white p-3">
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
                      activeTab === type.id &&
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
                      "flex h-full w-full flex-row items-stretch justify-between gap-8 rounded-lg bg-white p-4",
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
                            handleContent={(data) => {
                              console.log(
                                "[setData]",
                                JSON.stringify(data),
                                data.inputValues["website-website-link"],
                              );
                              setData(data.inputValues["website-website-link"]);
                            }}
                            minimalFlow
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-start justify-start gap-4 pt-4">
                        <QrTabsStepTitle
                          stepNumber={2}
                          title={"Customize your QR"}
                        />
                        <QrTabsCustomization
                          styleOptionActiveTab={styleOptionActiveTab}
                          setStyleOptionActiveActiveTab={
                            setStyleOptionActiveActiveTab
                          }
                          selectedSuggestedFrame={selectedSuggestedFrame}
                          selectedSuggestedLogo={selectedSuggestedLogo}
                          uploadedLogo={uploadedLogo}
                          isQrDisabled={isQrDisabled}
                          isMobile={isMobile}
                          options={options}
                          handlers={handlers}
                        />
                      </div>
                    </div>

                    <div className="bg-primary-100 relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg p-6">
                      <div className="sticky top-8 flex flex-col gap-6">
                        <QrTabsStepTitle
                          stepNumber={3}
                          title={"Download your QR"}
                        />
                        <div
                          className={cn(
                            "flex justify-center rounded-lg shadow-lg",
                            {
                              "opacity-30": isQrDisabled,
                            },
                          )}
                        >
                          <QRPreview qrCode={qrCode} />
                        </div>
                        <QrTabsDownloadButton isQrDisabled={isQrDisabled} />
                      </div>
                    </div>
                  </div>
                </Tabs.Content>
              );
            })}

            {isMobile && <QrTabsDownloadButton isQrDisabled={isQrDisabled} />}
          </Tabs.Root>
        )}

        {isMobile && <Rating />}

        {!isMobile && <LogoScrollingBanner />}
      </div>
    </section>
  );
});
