"use client";

import { QRCodeContentBuilder } from "@/ui/shared/qr-code-content-builder.tsx";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as Tabs from "@radix-ui/react-tabs";
import { Button } from "@radix-ui/themes";
import { StaticImageData } from "next/image";
import Link from "next/link";
import { CornerDotType, CornerSquareType } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { forwardRef, useState } from "react";
import { FileCardContent } from "../../../../(dashboard)/[slug]/new-qr/content/components/file-card-content.tsx";
import { ColorsSettings } from "../../../../(dashboard)/[slug]/new-qr/customization/components/colors-settings.tsx";
import { QRPreview } from "../../../../(dashboard)/[slug]/new-qr/customization/components/qr-review.tsx";
import { StylePicker } from "../../../../(dashboard)/[slug]/new-qr/customization/components/style-picker.tsx";
import {
  BORDER_STYLES,
  CENTER_STYLES,
  DOTS_STYLES,
  FRAMES,
  SUGGESTED_LOGOS,
} from "../../../../(dashboard)/[slug]/new-qr/customization/constants.ts";
import { useQrCustomization } from "../../../../(dashboard)/[slug]/new-qr/customization/hook/use-qr-customization.ts";
import {
  EQRType,
  FILE_QR_TYPES,
  QR_STYLES_OPTIONS,
  QR_TYPES,
} from "../../constants/get-qr-config.ts";
import { Rating } from "../rating-info/components/rating.tsx";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { QRTabsPopover } from "./components/qr-tabs-popover.tsx";
import { QrTabsTitle } from "./components/qr-tabs-title.tsx";

export const QRTabs = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("website");
  const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
    useState<string>("Frame");

  const handlePopoverItemClick = (tabId: string) => {
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
        <Tabs.Root
          ref={ref}
          value={activeTab}
          onValueChange={setActiveTab}
          className="mx-auto flex w-full flex-col items-center justify-center gap-[18px] rounded-lg bg-white p-4 md:rounded-none md:bg-transparent"
        >
          {isMobile ? (
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
          ) : (
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
          )}

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
                    isMobile && "p-0",
                  )}
                >
                  <div className="flex basis-3/5 flex-col justify-start gap-2">
                    <div className="border-b-border-400 flex flex-col items-start justify-start gap-4 border-b-2 pb-6">
                      <div className="flex flex-row items-center justify-start gap-2">
                        <div className="relative flex h-5 w-5 items-center justify-center rounded-full md:h-6 md:w-6">
                          <div
                            className="absolute inset-0 -m-[2px] rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
                              padding: "2px",
                            }}
                          >
                            <div className="text-neutral flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold md:text-sm">
                              1
                            </div>
                          </div>
                        </div>
                        <p className="text-neutral text-base font-medium">
                          Complete the content
                        </p>
                      </div>
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
                      <div className="flex flex-row items-center justify-start gap-2">
                        <div className="relative flex h-5 w-5 items-center justify-center rounded-full md:h-6 md:w-6">
                          <div
                            className="absolute inset-0 -m-[2px] rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
                              padding: "2px",
                            }}
                          >
                            <div className="text-neutral flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold md:text-sm">
                              2
                            </div>
                          </div>
                        </div>
                        <p className="text-neutral text-base font-medium">
                          Customize your QR
                        </p>
                      </div>
                      <Tabs.Root
                        value={styleOptionActiveTab}
                        onValueChange={setStyleOptionActiveActiveTab}
                        className="flex w-full flex-col items-center justify-center gap-4"
                      >
                        <Tabs.List className="flex w-full items-center gap-1 overflow-x-auto rounded-lg">
                          {QR_STYLES_OPTIONS.map((tab) => (
                            <Tabs.Trigger
                              key={tab.id}
                              value={tab.label}
                              className={cn(
                                "text-neutral flex items-center justify-center gap-2 rounded-md px-3.5 py-2 transition-colors",
                                "hover:bg-border-100 hover:text-neutral",
                                "data-[state=active]:bg-secondary-100 data-[state=active]:text-secondary",
                              )}
                            >
                              <span className="text-sm font-medium">
                                {tab.label}
                              </span>
                            </Tabs.Trigger>
                          ))}
                        </Tabs.List>
                        {QR_STYLES_OPTIONS.map((tab) => (
                          <Tabs.Content
                            key={tab.id}
                            value={tab.label}
                            className="w-full focus:outline-none"
                          >
                            {tab.id === "frame" && (
                              <StylePicker
                                label="Frames"
                                styleOptions={FRAMES}
                                selectedStyle={selectedSuggestedFrame}
                                onSelect={(type: string) => {
                                  if (isQrDisabled) {
                                    return;
                                  }
                                  handlers.onSuggestedFrameSelect(type);
                                }}
                                stylePickerWrapperClassName="border border-border-100 p-3 rounded-lg gap-5"
                                optionsWrapperClassName={cn("gap-2", {
                                  "pointer-events-none cursor-not-allowed":
                                    isQrDisabled,
                                })}
                                styleButtonClassName={
                                  "[&_img]:h-8 [&_img]:w-8 p-3.5"
                                }
                                minimalFlow
                              />
                            )}
                            {tab.id === "style" && (
                              <div className="flex max-w-[680px] flex-col gap-4">
                                <StylePicker
                                  label="QR code style"
                                  styleOptions={DOTS_STYLES}
                                  selectedStyle={
                                    options.dotsOptions?.type ?? "square"
                                  }
                                  onSelect={(type: string) =>
                                    handlers.onDotsStyleChange(type as DotType)
                                  }
                                  stylePickerWrapperClassName="border border-border-100 p-3 rounded-lg [&_label]:text-sm"
                                  optionsWrapperClassName="gap-2 md:flex-nowrap"
                                  styleButtonClassName={
                                    "[&_img]:h-5 [&_img]:w-5 p-3.5"
                                  }
                                />
                                <div className="border-border-100 rounded-lg border p-3 [&>div>div:first-child]:!flex-row">
                                  <ColorsSettings
                                    options={options}
                                    onBorderColorChange={
                                      handlers.onBorderColorChange
                                    }
                                    onBackgroundColorChange={
                                      handlers.onBackgroundColorChange
                                    }
                                    isMobile={isMobile}
                                    minimalFlow
                                  />
                                </div>
                              </div>
                            )}
                            {tab.id === "shape" && (
                              <div className="flex max-w-[680px] flex-col gap-4">
                                <div className="border-border-100 rounded-lg border p-3">
                                  <StylePicker
                                    label="Border Style"
                                    styleOptions={BORDER_STYLES}
                                    selectedStyle={
                                      options.cornersSquareOptions?.type ??
                                      "square"
                                    }
                                    onSelect={(type: string) => {
                                      handlers.onBorderStyleChange(
                                        type as CornerSquareType,
                                      );
                                    }}
                                    stylePickerWrapperClassName="[&_label]:text-sm"
                                    optionsWrapperClassName="gap-2 md:flex-nowrap"
                                    iconSize={30}
                                    styleButtonClassName={
                                      "[&_img]:h-5 [&_img]:w-5 p-3.5"
                                    }
                                  />
                                  <StylePicker
                                    label="Center Style"
                                    styleOptions={CENTER_STYLES}
                                    selectedStyle={
                                      options.cornersDotOptions?.type ??
                                      "square"
                                    }
                                    onSelect={(type: string) =>
                                      handlers.onCenterStyleChange(
                                        type as CornerDotType,
                                      )
                                    }
                                    stylePickerWrapperClassName="[&_label]:text-sm"
                                    optionsWrapperClassName="gap-2 md:flex-nowrap"
                                    iconSize={30}
                                    styleButtonClassName={
                                      "[&_img]:h-5 [&_img]:w-5 p-3.5"
                                    }
                                  />
                                </div>
                              </div>
                            )}
                            {tab.id === "logo" && (
                              <div className="border-border-100 flex max-w-[680px] flex-col gap-4 rounded-lg border p-3">
                                <StylePicker
                                  label="Select a logo"
                                  styleOptions={SUGGESTED_LOGOS}
                                  selectedStyle={selectedSuggestedLogo}
                                  onSelect={(
                                    type: string,
                                    icon?: StaticImageData,
                                  ) => {
                                    if (isQrDisabled) {
                                      return;
                                    }
                                    handlers.onSuggestedLogoSelect(
                                      type,
                                      icon?.src,
                                    );
                                  }}
                                  optionsWrapperClassName={cn("", {
                                    "pointer-events-none cursor-not-allowed":
                                      isQrDisabled,
                                  })}
                                  stylePickerWrapperClassName="[&_label]:text-sm"
                                  styleButtonClassName={
                                    "[&_img]:h-5 [&_img]:w-5 p-3.5"
                                  }
                                />
                                <FileCardContent
                                  qrType={EQRType.IMAGE}
                                  files={uploadedLogo ? [uploadedLogo] : []}
                                  setFiles={(
                                    files: File[] | ((prev: File[]) => File[]),
                                  ) => {
                                    const incoming: File[] =
                                      typeof files === "function"
                                        ? files([])
                                        : files;
                                    const file =
                                      incoming[incoming.length - 1] || null;

                                    handlers.setUploadedLogoFile(file);
                                    return file ? [file] : [];
                                  }}
                                  title="Upload your logo"
                                  multiple={false}
                                  minimumFlow
                                  isLogo
                                />
                              </div>
                            )}
                          </Tabs.Content>
                        ))}
                      </Tabs.Root>
                    </div>
                  </div>

                  <div className="bg-primary-100 relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg p-6">
                    <div className="sticky top-8 flex flex-col gap-6">
                      <div className="flex flex-row items-center justify-start gap-2">
                        <div className="relative flex h-5 w-5 items-center justify-center rounded-full md:h-6 md:w-6">
                          <div
                            className="absolute inset-0 -m-[2px] rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
                              padding: "2px",
                            }}
                          >
                            <div className="text-neutral flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold md:text-sm">
                              3
                            </div>
                          </div>
                        </div>
                        <p className="text-neutral text-base font-medium">
                          Download your QR
                        </p>
                      </div>
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
                      <Button
                        size={"3"}
                        color={"blue"}
                        variant="solid"
                        disabled={isQrDisabled}
                      >
                        <Link
                          className={cn(
                            "",
                            isQrDisabled &&
                              "pointer-events-none cursor-not-allowed",
                          )}
                          href={"/register"}
                        >
                          Download QR code
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            );
          })}
        </Tabs.Root>

        {isMobile && <Rating />}

        {!isMobile && <LogoScrollingBanner />}
      </div>
    </section>
  );
});
