"use client";

import { QRCodeContentBuilder } from "@/ui/shared/qr-code-content-builder.tsx";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as Tabs from "@radix-ui/react-tabs";
import { forwardRef, useCallback, useEffect, useState } from "react";
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
import { dataHandlers } from 'app/app.dub.co/(dashboard)/[slug]/new-qr/content/utils.ts';

export const QRTabs = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<EQRType>(EQRType.WEBSITE);
  const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
    useState<string>("Frame");
  const [stepActiveTab, setStepActiveTab] = useState<string>(
    QR_GENERATION_STEPS[0].id,
  );

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
  }, []);

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

  const handleContent = useCallback(({ inputValues, isHiddenNetwork, qrType }: {
    inputValues: Record<string, string>;
    files: File[];
    isHiddenNetwork: boolean;
    qrType: EQRType;
  }) => {
    setData(dataHandlers[qrType](inputValues, isHiddenNetwork));
  }, []);

  const nonFileQrTypes = QR_TYPES.filter(
    (qrType) => !FILE_QR_TYPES.includes(qrType.id),
  );

  return (
    <section className="bg-primary-100 w-full px-3 pb-6 md:pb-12">
      <div
        className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-4 md:gap-12"
        ref={ref}
      >
        <QrTabsTitle />
        {isMobile ? (
          <Tabs.Root
            value={stepActiveTab}
            onValueChange={setStepActiveTab}
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
                  <QrTabsStepTitle title={step.label} isMobile={isMobile} />
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {stepActiveTab === "content" && (
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
                  isMobile={isMobile}
                  showButtonContent
                  selectedQrType={nonFileQrTypes.find(
                    (type) => type.id === activeTab,
                  )}
                />

                <QRCodeContentBuilder
                  qrType={activeTab}
                  handleContent={handleContent}
                  minimalFlow
                />
              </Tabs.Content>
            )}
            {stepActiveTab === "design" && (
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
                  isMobile={isMobile}
                  options={options}
                  handlers={handlers}
                />
              </Tabs.Content>
            )}

            <QrTabsDownloadButton isQrDisabled={isQrDisabled} />
          </Tabs.Root>
        ) : (
          <Tabs.Root
            ref={ref}
            value={activeTab}
            onValueChange={setActiveTab as (value: string) => void}
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

                    <div className="bg-background relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg p-6">
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
          </Tabs.Root>
        )}

        {isMobile && <Rating />}

        {!isMobile && <LogoScrollingBanner />}
      </div>
    </section>
  );
});
