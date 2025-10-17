"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/ui/shared/logo";
import { EQRType, QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { Icon } from "@iconify/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import Image from "next/image";
import { FC, useState } from "react";

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
    <section className="py-6 sm:py-10 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with Title and Animated Logo */}
        <div className="mb-8 flex items-center justify-between gap-9 max-sm:flex-col sm:mb-12 lg:mb-16">
          <div className="max-w-3xl">
            <MotionPreset
              component="h2"
              className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl"
              fade
              slide={{ direction: "left", offset: 50 }}
              blur
              transition={{ duration: 0.5 }}
            >
              Generate the <span className="text-primary">Perfect QR Code</span> for Your Needs
            </MotionPreset>
            <MotionPreset
              component="p"
              className="text-muted-foreground text-lg md:text-xl"
              fade
              blur
              slide={{ direction: "left", offset: 50 }}
              delay={0.2}
              transition={{ duration: 0.5 }}
            >
              From websites and social media to PDFs, business cards, and Wi-Fi access—there's no
              limit to what you can create a QR code for. GetQR offers every type of QR code you
              need, all in one place.
            </MotionPreset>
          </div>

          {/* Animated Logo */}
          <MotionPreset
            fade
            blur
            zoom={{ initialScale: 0.75 }}
            delay={0.4}
            transition={{ duration: 0.5 }}
            className="mx-auto flex"
          >
            <div className="relative flex h-36 w-36 items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <Logo className="z-10 scale-150" />
              </div>
              {/* Rotating gradient border */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-[spin_3s_linear_infinite] opacity-20 blur-sm"></div>
              <div className="absolute inset-3 rounded-full bg-gradient-to-r from-secondary via-primary to-secondary bg-[length:200%_100%] animate-[spin_4s_linear_infinite_reverse] opacity-30 blur-md"></div>
            </div>
          </MotionPreset>
        </div>

        <Tabs value={activeTab} onValueChange={onQrTypeClick} className="w-full">
          <MotionPreset
            fade
            blur
            slide={{ direction: "up", offset: 50 }}
            delay={0.5}
            transition={{ duration: 0.5 }}
          >
            <ScrollArea.Root className="w-full">
              <ScrollArea.Viewport className="w-full overflow-x-auto pt-3">
                <TabsList className="flex mb-4 h-auto w-max min-w-full justify-start gap-3 bg-transparent p-0 sm:gap-4 lg:justify-center">
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
                        className="group relative flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-transparent bg-card px-3 py-4 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-md sm:h-28 sm:w-28"
                      >
                        {/* Gradient background on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-secondary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-[state=active]:from-primary/5 group-data-[state=active]:to-secondary/5 group-data-[state=active]:opacity-100"></div>

                        <Icon
                          icon={type.icon}
                          className="relative z-10 h-7 w-7 text-muted-foreground transition-all duration-300 group-hover:scale-110 group-hover:text-primary group-data-[state=active]:text-primary sm:h-8 sm:w-8"
                        />
                        <span className="relative z-10 text-center text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-primary group-data-[state=active]:text-primary">
                          {type.label}
                        </span>
                      </TabsTrigger>
                    </MotionPreset>
                  ))}
                </TabsList>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="horizontal"
                className="flex h-2 translate-y-1 touch-none select-none flex-col bg-muted/50 transition-colors"
              >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-primary/50 transition-colors hover:bg-primary/70" />
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
                    <Avatar className="border-primary h-12 w-12 border">
                      <AvatarFallback className="bg-primary/10 text-primary [&>svg]:size-6">
                        <Icon icon={type.icon} />
                      </AvatarFallback>
                    </Avatar>

                    <p className="text-primary text-sm font-semibold uppercase tracking-wide">
                      {type.label}
                    </p>

                    <h3 className="text-card-foreground text-2xl font-bold md:text-3xl">
                      {type.info}
                    </h3>

                    <p className="text-muted-foreground text-base md:text-lg">{type.content}</p>

                    <Button
                      className="bg-secondary hover:bg-secondary/90 w-fit"
                      size="lg"
                      onClick={() => handleScrollButtonClick("2", type.scrollTo)}
                    >
                      Create {type.label} QR code
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
                  <div className="relative h-[400px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10">
                    <Image
                      src={type.img}
                      alt={type.label}
                      fill
                      className="object-contain p-8"
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
