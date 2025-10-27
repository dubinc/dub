"use client";

import { Button } from "@/components/ui/button";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EQRType,
  QR_TYPES,
} from "@/ui/qr-builder-new/constants/get-qr-config.ts";
import { Icon } from "@iconify/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import Image from "next/image";
import { FC, useState } from "react";
import { QrTabsDetailedTitle } from "./components/qr-tabs-detailed-title";

interface IQrTabsDetailedProps {
  sessionId: string;
  handleScrollButtonClick: (type: "1" | "2", scrollTo?: EQRType) => void;
}

export const QrTabsDetailed: FC<IQrTabsDetailedProps> = ({
  sessionId,
  handleScrollButtonClick,
}) => {
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
    <section className="py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with Title */}
        <div className="mb-8 flex items-center justify-center text-center">
          <div className="flex max-w-3xl flex-col items-center justify-center gap-3">
            <QrTabsDetailedTitle />
            <MotionPreset
              fade
              blur
              slide={{ direction: "down", offset: 50 }}
              delay={0.2}
              transition={{ duration: 0.5 }}
            >
              <p className="text-muted-foreground max-w-4xl text-base md:text-lg">
                GetQR brings every QR code type in one place. Create, customize,
                share, scan and analyze.
              </p>
            </MotionPreset>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onQrTypeClick}
          className="w-full"
        >
          <MotionPreset
            fade
            blur
            slide={{ direction: "up", offset: 50 }}
            delay={0.5}
            transition={{ duration: 0.5 }}
          >
            <ScrollArea.Root className="w-full">
              <ScrollArea.Viewport className="w-full overflow-x-auto pt-3">
                <TabsList className="mb-4 flex h-auto w-max min-w-full justify-start gap-3 bg-transparent p-0 sm:gap-4">
                  {QR_TYPES.map((type, index) => (
                    <MotionPreset
                      key={type.id}
                      fade
                      zoom={{ initialScale: 0.8 }}
                      delay={0.6 + index * 0.05}
                      transition={{ duration: 0.3 }}
                    >
                      <TabsTrigger
                        value={type.id}
                        className="bg-card hover:border-primary/30 data-[state=active]:border-primary data-[state=active]:bg-primary/5 group relative flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-transparent px-3 py-4 shadow-sm transition-all duration-300 data-[state=active]:shadow-md sm:h-28 sm:w-28"
                      >
                        <Icon
                          icon={type.icon}
                          className="text-muted-foreground group-data-[state=active]:text-primary relative z-10 h-7 w-7 transition-colors duration-300 sm:h-8 sm:w-8"
                        />
                        <span className="text-muted-foreground group-data-[state=active]:text-primary relative z-10 text-center text-xs font-medium transition-colors duration-300">
                          {type.label}
                        </span>
                      </TabsTrigger>
                    </MotionPreset>
                  ))}
                </TabsList>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="horizontal"
                className="bg-muted/50 flex h-2 translate-y-1 touch-none select-none flex-col transition-colors"
              >
                <ScrollArea.Thumb className="bg-primary/50 hover:bg-primary/70 relative flex-1 rounded-full transition-colors" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </MotionPreset>

          {QR_TYPES.map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <div className="flex flex-col items-center justify-between gap-8 lg:flex-row lg:gap-12">
                {/* Left side - Content */}
                <MotionPreset
                  fade
                  slide={{ direction: "down", offset: 70 }}
                  blur
                  transition={{ duration: 0.7 }}
                  className="w-full lg:w-1/2"
                >
                  <div className="flex flex-col gap-6">
                    <h3 className="text-card-foreground text-2xl font-bold md:text-3xl">
                      {type.label}
                    </h3>

                    <p className="text-muted-foreground text-base md:text-lg">
                      {type.content}
                    </p>

                    <Button
                      className="bg-secondary hover:bg-secondary/90 w-fit"
                      size="lg"
                      onClick={() =>
                        handleScrollButtonClick("2", type.scrollTo)
                      }
                    >
                      Create QR code
                    </Button>
                  </div>
                </MotionPreset>

                {/* Right side - Image */}
                <MotionPreset
                  fade
                  blur
                  zoom={{ initialScale: 0.75 }}
                  transition={{ duration: 0.7 }}
                  className="w-full lg:w-1/2"
                >
                  <div className="from-primary/10 via-primary/5 to-secondary/10 relative h-[280px] w-full overflow-hidden rounded-2xl bg-gradient-to-br">
                    <Image
                      src={type.img}
                      alt={type.label}
                      fill
                      className="object-contain p-6"
                      priority
                    />
                  </div>
                </MotionPreset>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};
