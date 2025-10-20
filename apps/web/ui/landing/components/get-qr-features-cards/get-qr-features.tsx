"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { FC, useEffect, useState } from "react";
import { SectionTitle } from "../section-title.tsx";
import { GET_QR_FEATURES } from "./config.ts";

export const GetQRFeaturesCardsSection: FC = () => {
  const [activeTab, setActiveTab] = useState(
    GET_QR_FEATURES[0].title.toLowerCase().replace(/\s+/g, "-")
  );
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = GET_QR_FEATURES.findIndex(
          (f) => f.title.toLowerCase().replace(/\s+/g, "-") === current
        );
        const nextIndex = (currentIndex + 1) % GET_QR_FEATURES.length;
        return GET_QR_FEATURES[nextIndex].title
          .toLowerCase()
          .replace(/\s+/g, "-");
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsPaused(true);
    // Resume auto-rotation after 10 seconds of manual selection
    setTimeout(() => setIsPaused(false), 10000);
  };

  return (
    <section className="relative py-8 sm:py-16 lg:py-24">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/5 absolute left-1/4 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute bottom-0 right-1/4 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:mb-16 lg:mb-24 lg:gap-10">
          <MotionPreset
            fade
            slide={{ direction: "down", offset: 50 }}
            blur
            transition={{ duration: 0.5 }}
          >
            <SectionTitle
              titleFirstPart="More Than Just a "
              highlightedTitlePart="QR Code"
              titleSecondPart=" Generator"
            />
          </MotionPreset>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <MotionPreset
            fade
            blur
            slide={{ direction: "down", offset: 30 }}
            delay={0.3}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex w-full justify-center overflow-x-auto pb-2 sm:mb-12">
              <TabsList className="inline-flex h-auto w-full gap-2 bg-muted/50 p-1.5 backdrop-blur-sm sm:w-auto sm:gap-3 sm:rounded-2xl sm:p-2">
                {GET_QR_FEATURES.map((feature, index) => (
                  <MotionPreset
                    key={feature.title}
                    fade
                    zoom={{ initialScale: 0.9 }}
                    delay={0.4 + index * 0.05}
                    transition={{ duration: 0.3 }}
                  >
                    <TabsTrigger
                      value={feature.title.toLowerCase().replace(/\s+/g, "-")}
                      className="group relative flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-transparent px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-background/50 data-[state=active]:bg-background data-[state=active]:shadow-md sm:min-w-[160px] sm:px-5 sm:py-3.5 sm:text-base"
                    >
                      <Icon
                        icon={feature.icon}
                        className={cn(
                          "size-5 transition-colors duration-300",
                          "text-muted-foreground group-data-[state=active]:text-primary"
                        )}
                      />
                      <span className="whitespace-nowrap">{feature.title}</span>
                    </TabsTrigger>
                  </MotionPreset>
                ))}
              </TabsList>
            </div>
          </MotionPreset>

          {GET_QR_FEATURES.map((feature) => (
            <TabsContent
              key={feature.title}
              value={feature.title.toLowerCase().replace(/\s+/g, "-")}
              className="mt-0"
            >
              <MotionPreset
                fade
                slide={{ direction: "up", offset: 40 }}
                blur
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="mx-auto max-w-4xl">
                  <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-8 shadow-xl backdrop-blur-sm sm:p-12 lg:p-16">
                    {/* Decorative corner accents */}
                    <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-primary/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr from-secondary/10 to-transparent" />

                    <div className="relative flex flex-col items-center gap-6 text-center sm:gap-8">
                      <div className="relative inline-flex">
                        <Avatar
                          className={cn(
                            "h-24 w-24 rounded-3xl border-2 shadow-lg sm:h-28 sm:w-28 lg:h-32 lg:w-32",
                            feature.avatarTextColor,
                          )}
                        >
                          <AvatarFallback
                            className={cn(
                              "rounded-3xl bg-gradient-to-br from-background to-muted [&>svg]:size-12 sm:[&>svg]:size-14 lg:[&>svg]:size-16",
                              feature.avatarTextColor,
                            )}
                          >
                            <Icon icon={feature.icon} />
                          </AvatarFallback>
                        </Avatar>
                        {/* Enhanced glow effect */}
                        <div
                          className={cn(
                            "absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl",
                            feature.avatarTextColor,
                          )}
                        />
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <h3 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg lg:text-xl">
                          {feature.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </MotionPreset>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Separator className="my-8 sm:my-12" />
    </section>
  );
};
