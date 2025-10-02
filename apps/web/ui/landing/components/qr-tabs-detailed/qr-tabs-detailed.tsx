"use client";

import { EQRType, QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import { Heading, Text } from "@radix-ui/themes";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { FC, useState } from "react";
import { QrTabsDetailedImage } from "./components/qr-tabs-detailed-image.tsx";
import { QrTabsDetailedTitle } from "./components/qr-tabs-detailed-title.tsx";

interface IQrTabsDetailedProps {
  sessionId: string;
  handleScrollButtonClick: (type: "1" | "2", scrollTo?: EQRType) => void;
}

export const QrTabsDetailed: FC<IQrTabsDetailedProps> = ({
  sessionId,
  handleScrollButtonClick,
}) => {
  const { isMobile } = useMediaQuery();

  const [activeTab, setActiveTab] = useState<string>("website");

  const onQrTypeClick = (newActiveTab: string) => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: newActiveTab,
        content_group: "carousel",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    setActiveTab(newActiveTab);
  };

  return (
    <section className="bg-primary-100 w-full px-3 py-10 lg:py-14">
      <div className="mx-auto flex max-w-[1172px] flex-col items-center justify-center gap-6 lg:gap-10">
        <div className="flex flex-col items-center justify-center gap-4 md:gap-6">
          <QrTabsDetailedTitle />
          <Text
            align={{ initial: "left", md: "center" }}
            size={{ initial: "4", md: "5" }}
            className="text-neutral-300"
          >
            From websites and social media to PDFs, business cards, and Wi-Fi
            access—there’s no limit to <br /> what you can create a QR code for.
            GetQR offers every type of QR code you need, all in one place.
          </Text>
        </div>
        <Tabs.Root
          value={activeTab}
          onValueChange={onQrTypeClick}
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
                      "bg-primary-200 text-neutral group flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-3 transition-colors md:h-[104px] md:w-[116px] md:gap-3",
                      "hover:bg-secondary-100 hover:text-secondary",
                      "data-[state=active]:bg-secondary-100 data-[state=active]:text-secondary",
                    )}
                  >
                    <Icon
                      icon={type.icon}
                      className={cn(
                        "h-7 w-7 flex-none",
                        idx === 2
                          ? "group-hover:[&>path]:fill-secondary [&>path]:fill-neutral-200"
                          : "group-hover:[&>g]:stroke-secondary group-hover:[&>path]:stroke-secondary [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                        activeTab === type.id &&
                          (idx === 2
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
                  <div className="bg-border-100 relative h-[413px] w-full max-w-[534px] flex-shrink-0 overflow-hidden rounded-lg">
                    <QrTabsDetailedImage
                      imgSrc={type.img}
                      {...(!isMobile && { width: 270, height: 420 })}
                      className={idx === 1 ? "top-[61.5%] md:top-[57%]" : ""}
                    />
                  </div>
                  <div className="flex max-w-[520px] flex-col items-start justify-start gap-3 md:gap-4">
                    <div className="flex flex-col items-start justify-start gap-2 md:gap-3">
                      <Heading
                        as="h3"
                        size="4"
                        align="left"
                        weight="medium"
                        className="text-neutral"
                      >
                        {type.label}
                      </Heading>
                      <Text size="3" align="left" className="text-neutral-300">
                        {type.content}
                      </Text>
                    </div>
                    <Button
                      className="flex w-full flex-row items-center justify-center gap-2 md:max-w-[201px]"
                      size={{ initial: "4", md: "3" }}
                      color="blue"
                      onClick={() =>
                        handleScrollButtonClick("2", type.scrollTo)
                      }
                      text="Create QR code"
                    />
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
