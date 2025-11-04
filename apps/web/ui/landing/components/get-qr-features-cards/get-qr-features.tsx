"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { FC, useEffect, useState } from "react";
import { SectionTitle } from "../section-title.tsx";
import { GET_QR_FEATURES } from "./config.ts";

interface GetQRFeaturesCardsSectionProps {
  initialTab?: string;
}

export const GetQRFeaturesCardsSection: FC<GetQRFeaturesCardsSectionProps> = ({
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState(
    initialTab || GET_QR_FEATURES[0].title.toLowerCase().replace(/\s+/g, "-"),
  );
  const [isPaused, setIsPaused] = useState(false);

  // Update active tab if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 10000);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = GET_QR_FEATURES.findIndex(
          (f) => f.title.toLowerCase().replace(/\s+/g, "-") === current,
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
    <section id="features" className="relative overflow-hidden py-10 lg:py-14">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/5 absolute left-1/4 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute bottom-0 right-1/4 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center gap-3">
          <SectionTitle
            titleFirstPart="More Than Just a "
            highlightedTitlePart="QR Code"
            titleSecondPart=" Generator"
          />
          <p className="text-muted-foreground max-w-4xl text-center text-base md:text-lg">
            Own the full lifecycle: creation, refinement, data insights.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            {/* Simple tabs on the left */}
            <div className="w-full lg:w-auto">
              <TabsList className="flex h-auto w-full flex-col items-start gap-2 bg-transparent p-0 lg:sticky lg:top-24">
                {GET_QR_FEATURES.map((feature) => (
                  <TabsTrigger
                    key={feature.title}
                    value={feature.title.toLowerCase().replace(/\s+/g, "-")}
                    className={cn(
                      "hover:bg-muted/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 group relative flex items-center justify-start gap-3 rounded-lg border-l-4 border-transparent bg-transparent px-4 py-3 text-left transition-all duration-300",
                    )}
                  >
                    <Icon
                      icon={feature.icon}
                      className={cn(
                        "size-5 flex-shrink-0 transition-colors duration-300",
                        "text-muted-foreground group-data-[state=active]:text-primary",
                      )}
                    />
                    <span className="text-foreground group-data-[state=active]:text-primary whitespace-nowrap text-sm font-medium sm:text-base">
                      {feature.title}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content on the right */}
            <div className="flex-1">
              {GET_QR_FEATURES.map((feature) => (
                <TabsContent
                  key={feature.title}
                  value={feature.title.toLowerCase().replace(/\s+/g, "-")}
                  className="mt-0"
                >
                  <div className="border-border/50 from-background via-background to-muted/20 relative h-full overflow-hidden rounded-3xl border bg-gradient-to-br p-8 shadow backdrop-blur-sm sm:p-10 lg:p-12">
                    {/* Decorative corner accents */}
                    <div className="from-primary/10 absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl to-transparent" />
                    <div className="from-secondary/10 absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr to-transparent" />

                    <div className="relative flex flex-col gap-6 sm:gap-8">
                      <div className="flex items-start gap-6">
                        <div className="relative inline-flex flex-shrink-0">
                          <Avatar
                            className={cn(
                              "h-20 w-20 rounded-2xl border-2 shadow sm:h-24 sm:w-24",
                              feature.avatarTextColor,
                            )}
                          >
                            <AvatarFallback
                              className={cn(
                                "from-background to-muted rounded-2xl bg-gradient-to-br [&>svg]:size-10 sm:[&>svg]:size-12",
                                feature.avatarTextColor,
                              )}
                            >
                              <Icon icon={feature.icon} />
                            </AvatarFallback>
                          </Avatar>
                          {/* Enhanced glow effect */}
                          <div
                            className={cn(
                              "absolute -inset-3 -z-10 rounded-2xl opacity-30 blur-2xl",
                              feature.avatarTextColor,
                            )}
                          />
                        </div>

                        <div className="flex-1 space-y-3">
                          <h3 className="from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-2xl font-bold text-transparent sm:text-3xl lg:text-4xl">
                            {feature.title}
                          </h3>
                          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
                            {feature.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      </div>
      <Separator className="my-8 sm:my-12" />
    </section>
  );
};
