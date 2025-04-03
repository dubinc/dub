"use client";

import { Input, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useState } from "react";
import {
  ADDITIONAL_QR_TYPES,
  DEFAULT_QR_TYPES,
  LINKED_QR_TYPE_LABELS,
  QR_TYPES,
} from "../../constants/get-qr-config.ts";
import { Rating } from "../rating-info/components/rating.tsx";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { QrTabsImage } from "./components/qr-tabs-image.tsx";
import { QRTabsPopover } from "./components/qr-tabs-popover.tsx";
import { QrTabsTitle } from "./components/qr-tabs-title.tsx";

export const QRTabs = () => {
  const { isMobile } = useMediaQuery();

  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("website");

  const handlePopoverItemClick = (tabId: string) => {
    setActiveTab(tabId);
    setOpenPopover(false);
  };

  return (
    <section className="bg-primary-100 w-full px-3 pb-6 md:pb-[42px]">
      <div className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-4 md:gap-[42px]">
        <QrTabsTitle />
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="mx-auto flex w-full flex-col items-center justify-center gap-[18px] rounded-lg bg-white p-4 md:rounded-none md:bg-transparent"
        >
          {isMobile && <QrTabsImage width={320} />}

          {isMobile ? (
            <QRTabsPopover
              qrTypes={QR_TYPES}
              setOpenPopover={setOpenPopover}
              openPopover={openPopover}
              handlePopoverItemClick={handlePopoverItemClick}
              isMobile={isMobile}
              showButtonContent
              selectedQrType={QR_TYPES.find((type) => type.id === activeTab)}
            />
          ) : (
            <Tabs.List className="flex w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-white p-3">
              {DEFAULT_QR_TYPES.map((type, idx) => (
                <Tabs.Trigger
                  key={type.id}
                  value={type.id}
                  className={cn(
                    "text-neutral flex w-32 items-center justify-center gap-2 rounded-md px-4 py-3.5 transition-colors",
                    "hover:bg-primary-300 hover:text-neutral",
                    "data-[state=active]:bg-primary-300 data-[state=active]:text-neutral",
                  )}
                >
                  <Icon
                    icon={type.icon}
                    className={cn(
                      "h-5 w-5 flex-none",
                      idx === 4
                        ? "[&>path]:fill-neutral-200"
                        : "[&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                      activeTab === type.id &&
                        (idx === 4
                          ? "[&>path]:fill-primary"
                          : "[&>g]:stroke-primary [&>path]:stroke-primary"),
                    )}
                  />
                  <span className="truncate text-sm font-normal md:text-xs">
                    {type.label}
                  </span>
                </Tabs.Trigger>
              ))}
              <QRTabsPopover
                qrTypes={ADDITIONAL_QR_TYPES}
                setOpenPopover={setOpenPopover}
                openPopover={openPopover}
                handlePopoverItemClick={handlePopoverItemClick}
                isMobile={isMobile}
                selectedQrType={QR_TYPES.find((type) => type.id === activeTab)}
              />
            </Tabs.List>
          )}

          {QR_TYPES.map((type, idx) => {
            const firstTab = idx === 0;
            const showWebsiteInput = LINKED_QR_TYPE_LABELS.includes(type.id);

            return (
              <Tabs.Content
                key={type.id}
                value={type.id}
                className={cn("focus:outline-none", isMobile && "w-full")}
              >
                <div
                  className={cn(
                    "flex items-center gap-8 rounded-lg bg-white p-4 md:min-h-[264px]",
                    isMobile && "w-full p-0",
                  )}
                >
                  <div className="flex h-full flex-1 flex-col items-start justify-between gap-20">
                    {!isMobile && (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-neutral text-xl font-semibold">
                          {type.label}
                        </h3>
                        <p className="text-sm text-neutral-300">
                          {type.content}
                        </p>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex flex-col items-center gap-0 md:flex-row md:items-end",
                        showWebsiteInput && "gap-4",
                        isMobile && "w-full",
                      )}
                    >
                      {showWebsiteInput && (
                        <div
                          className={cn(
                            "flex basis-3/5 flex-col gap-2",
                            isMobile && "w-full",
                          )}
                        >
                          <p className="text-secondary-text text-xs font-medium md:text-sm">
                            Enter your {type.label.toLowerCase()}
                          </p>
                          <Input
                            className="border-secondary h-11 min-w-[330px]"
                            type="text"
                            placeholder="https://www.getqr.com/"
                          />
                        </div>
                      )}
                      <Link
                        href="/register"
                        className={cn(
                          "bg-secondary hover:bg-secondary/90 flex h-11 w-full items-center justify-center rounded-md px-6 py-3 text-sm font-medium text-white transition-colors md:text-base",
                          firstTab && "basis-2/5",
                        )}
                      >
                        {!firstTab && isMobile
                          ? "Register Now"
                          : "Create QR code"}
                      </Link>
                      {isMobile && (
                        <p
                          className={cn(
                            "mt-3 text-sm text-neutral-200",
                            firstTab && "mt-0",
                          )}
                        >
                          No credit card is required during registration.
                        </p>
                      )}
                    </div>
                  </div>
                  {!isMobile && <QrTabsImage />}
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
};
