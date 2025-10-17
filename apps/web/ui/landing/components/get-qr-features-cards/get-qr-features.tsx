"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Step1Image from "@/ui/landing/assets/png/create-qr-step-1.png";
import Step2Image from "@/ui/landing/assets/png/create-qr-step-2.png";
import Step3Image from "@/ui/landing/assets/png/create-qr-step-3.png";
import WebsiteImage from "@/ui/landing/assets/png/get-qr-website-full.png";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { FC } from "react";
import { SectionTitle } from "../section-title.tsx";
import { GET_QR_FEATURES } from "./config.ts";

// Map images to features
const FEATURE_IMAGES = [Step1Image, Step2Image, Step3Image, WebsiteImage];

export const GetQRFeaturesCardsSection: FC = () => {
  return (
    <section className="relative py-8 sm:py-16 lg:py-24">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
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

          <MotionPreset
            fade
            blur
            slide={{ direction: "down", offset: 50 }}
            delay={0.2}
            transition={{ duration: 0.5 }}
          >
            <p className="text-muted-foreground mx-auto max-w-3xl text-center text-base sm:text-lg md:text-xl">
              Discover a suite of essential features designed to enhance your experience.
              Enjoy customizable settings, real-time analytics, and high-quality downloads
              to streamline your workflow and keep you productive.
            </p>
          </MotionPreset>
        </div>

        <Tabs
          defaultValue={GET_QR_FEATURES[0].title
            .toLowerCase()
            .replace(/\s+/g, "-")}
          className="gap-8 sm:gap-16 lg:gap-24"
        >
          <MotionPreset
            fade
            blur
            slide={{ direction: "left", offset: 50 }}
            delay={0.4}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full overflow-x-auto">
              <TabsList className="h-full w-full max-sm:flex-col sm:w-max md:gap-1">
                {GET_QR_FEATURES.map((feature) => (
                  <TabsTrigger
                    key={feature.title}
                    value={feature.title.toLowerCase().replace(/\s+/g, "-")}
                    className="flex items-center gap-1 px-2 py-2 max-sm:w-full sm:px-2.5 md:px-3"
                  >
                    <Icon icon={feature.icon} className="size-4" />
                    {feature.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </MotionPreset>

          {GET_QR_FEATURES.map((feature, index) => (
            <TabsContent
              key={feature.title}
              value={feature.title.toLowerCase().replace(/\s+/g, "-")}
              className="mt-8 sm:mt-12"
            >
              <div className="flex flex-col items-center justify-between gap-6 sm:gap-8 md:gap-10 lg:flex-row lg:gap-12">
                <MotionPreset
                  fade
                  slide={{ direction: "left", offset: 70 }}
                  blur
                  transition={{ duration: 0.7 }}
                  className="w-full lg:w-1/2"
                >
                  <div className="flex flex-col gap-4 sm:gap-5">
                    <div className="relative inline-flex">
                      <Avatar
                        className={cn(
                          "h-14 w-14 rounded-xl border-2 sm:h-16 sm:w-16",
                          feature.avatarTextColor,
                        )}
                      >
                        <AvatarFallback
                          className={cn(
                            "rounded-xl bg-transparent [&>svg]:size-6 sm:[&>svg]:size-7",
                            feature.avatarTextColor,
                          )}
                        >
                          <Icon icon={feature.icon} />
                        </AvatarFallback>
                      </Avatar>
                      {/* Decorative glow behind avatar */}
                      <div className={cn("absolute -inset-2 -z-10 rounded-xl opacity-20 blur-xl", feature.avatarTextColor)} />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-card-foreground text-2xl font-bold sm:text-3xl lg:text-4xl">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-base leading-relaxed sm:text-lg lg:text-xl">
                        {feature.content}
                      </p>
                    </div>
                  </div>
                </MotionPreset>

                <MotionPreset
                  fade
                  blur
                  zoom={{ initialScale: 0.85 }}
                  transition={{ duration: 0.7 }}
                  className="w-full lg:w-1/2"
                >
                  <div className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/30 to-muted/10 shadow-lg transition-all duration-300 hover:shadow-xl">
                    <div className="relative h-[220px] sm:h-[280px] md:h-[320px]">
                      <Image
                        src={FEATURE_IMAGES[index]}
                        alt={feature.title}
                        fill
                        className="object-contain p-6 transition-transform duration-300 group-hover:scale-105 sm:p-8 md:p-10"
                        priority={index === 0}
                      />
                    </div>
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
