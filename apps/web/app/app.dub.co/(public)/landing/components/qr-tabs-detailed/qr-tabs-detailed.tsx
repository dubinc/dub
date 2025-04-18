"use client";

import QrCodeIcon from "@/ui/landing/assets/svg/qr-code.svg";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { QR_TYPES } from "../../constants/get-qr-config.ts";
import { QrTabsDetailedImage } from "./components/qr-tabs-detailed-image.tsx";
import { QrTabsDetailedTitle } from "./components/qr-tabs-detailed-title.tsx";

export const QrTabsDetailed = () => {
  const { isMobile } = useMediaQuery();

  const [activeTab, setActiveTab] = useState<string>("website");

  return (
    <section className="bg-primary-100 w-full px-3 py-6 md:py-[42px]">
      <div className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-4 md:gap-8">
        <div className="flex flex-col items-center justify-center gap-3 md:gap-4">
          <QrTabsDetailedTitle />
          <p className="text-left text-sm text-neutral-300 md:text-center md:text-lg">
            From websites and social media to PDFs, business cards, and Wi-Fi
            access—there’s no limit to <br /> what you can create a QR code for.
            GetQR offers every type of QR code you need, all in one place.
          </p>
        </div>
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full flex-col items-center justify-center gap-6"
        >
          <ScrollArea.Root
            type={isMobile ? "always" : undefined}
            className="w-full p-0"
          >
            <ScrollArea.Viewport className="overflow-x-scroll">
              <Tabs.List className="flex flex-row justify-between gap-4">
                {QR_TYPES.map((type, idx) => (
                  <Tabs.Trigger
                    key={type.id}
                    value={type.id}
                    className={cn(
                      "bg-primary-200 text-neutral group flex h-24 w-24 flex-col items-center justify-around gap-2 rounded-lg border border-transparent px-2 py-3 transition-colors md:h-[104px] md:w-[116px] md:gap-3",
                      "hover:bg-secondary-100 hover:text-secondary",
                      "data-[state=active]:bg-secondary-100 data-[state=active]:text-secondary",
                    )}
                  >
                    <Icon
                      icon={type.icon}
                      className={cn(
                        "h-7 w-7 flex-none",
                        idx === 4
                          ? "group-hover:[&>path]:fill-secondary [&>path]:fill-neutral-200"
                          : "group-hover:[&>g]:stroke-secondary group-hover:[&>path]:stroke-secondary [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                        activeTab === type.id &&
                          (idx === 4
                            ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
                            : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
                      )}
                    />
                    <span className="text-wrap text-xs font-normal">
                      {type.label}
                    </span>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="horizontal"
              className="!bg-border-100 !-bottom-[14%] !h-1 rounded-[3px] border border-[#00002D17]"
            >
              <ScrollArea.Thumb className="!bg-primary !h-full rounded-lg" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {QR_TYPES.map((type, idx) => {
            return (
              <Tabs.Content
                key={type.id}
                value={type.id}
                className={cn("w-full focus:outline-none md:mt-0")}
              >
                <div className="flex w-full flex-col items-center justify-start gap-[14px] rounded-lg md:flex-row md:gap-8">
                  <div className="bg-primary-300 relative h-[413px] w-full max-w-[534px] flex-shrink-0 overflow-hidden rounded-lg">
                    <div className="to-primary absolute bottom-[23px] left-1/2 h-[328px] w-[314px] -translate-x-1/2 rounded-[99px] bg-gradient-to-b from-white opacity-50 blur-[80px]"></div>
                    <QrTabsDetailedImage
                      imgSrc={type.img}
                      {...(!isMobile && { width: 270, height: 420 })}
                      className={idx === 1 ? "top-[61.5%] md:top-[57%]" : ""}
                    />
                  </div>
                  <div className="flex max-w-[520px] flex-col items-start justify-start gap-3 md:gap-[18px]">
                    <div className="flex flex-col items-start justify-start gap-2 md:gap-3">
                      <h3 className="text-neutral text-left text-base font-semibold md:text-lg">
                        {type.label}
                      </h3>
                      <p className="text-left text-sm text-neutral-300 md:text-base">
                        {type.content}
                      </p>
                    </div>
                    <Link
                      href="/register"
                      type="button"
                      className="bg-secondary hover:bg-secondary/90 flex h-11 w-full max-w-none basis-1/4 flex-row items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium text-white transition-colors md:max-w-[201px] md:text-base"
                    >
                      Create QR code
                      <Image width={20} src={QrCodeIcon} alt="QR Code" />
                    </Link>
                  </div>
                </div>
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      </div>
    </section>
  );
};
