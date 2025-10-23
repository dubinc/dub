"use client";

import { Badge } from "@/components/ui/badge";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Icon } from "@iconify/react";
import { FC } from "react";

interface IHeroSectionProps {
  sessionId: string;
  onCreateQRClick: () => void;
}

const QR_STATS = [
  {
    icon: "solar:qr-code-bold",
    title: "QR Codes Created",
    value: "2.5M+",
    changePercentage: "+24.5%",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-600",
  },
  {
    icon: "solar:graph-up-bold",
    title: "Total Scans",
    value: "50M+",
    changePercentage: "+18.2%",
    color: "from-green-500/20 to-green-600/20",
    iconColor: "text-green-600",
  },
  {
    icon: "solar:users-group-rounded-bold",
    title: "Active Users",
    value: "100K+",
    changePercentage: "+32.4%",
    color: "from-purple-500/20 to-purple-600/20",
    iconColor: "text-purple-600",
  },
];

export const HeroSection: FC<IHeroSectionProps> = ({ onCreateQRClick }) => {
  return (
    <section className="relative flex">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/10 absolute left-1/4 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-secondary/10 absolute right-1/4 top-1/3 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <div className="grid flex-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Hero Content */}
          <div className="flex flex-col justify-center gap-6 py-4 max-lg:items-center max-lg:text-center sm:gap-8 sm:py-8 lg:gap-10 lg:py-12">
            <div className="flex flex-col gap-4 max-lg:items-center sm:gap-6">
              <MotionPreset fade slide transition={{ duration: 0.5 }}>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full">
                  <Icon icon="solar:qr-code-bold" className="mr-1.5 size-3.5" />
                  QR Code Generator
                </Badge>
              </MotionPreset>

              <MotionPreset
                component="h1"
                fade
                slide
                delay={0.2}
                transition={{ duration: 0.5 }}
                className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl"
              >
                Create Professional
                <br />
                <span className="text-primary">QR Codes</span> in Seconds
              </MotionPreset>

              <MotionPreset
                component="p"
                fade
                slide
                delay={0.4}
                transition={{ duration: 0.5 }}
                className="text-muted-foreground max-w-2xl text-sm sm:text-base lg:text-lg"
              >
                Generate customizable, high-quality QR codes for websites, PDFs,
                images, videos, and more. Track analytics, design with your
                brand colors, and download in multiple formats—all in one
                powerful platform.
              </MotionPreset>
            </div>
          </div>

          {/* Floating Cards Section */}
          <div className="relative flex items-center justify-center max-lg:hidden">
            <MotionPreset
              fade
              slide={{ direction: "down", offset: 64 }}
              delay={1}
              transition={{ duration: 0.5 }}
              className="relative h-full w-full"
            >
              {/* Central QR Code Display */}
              <MotionPreset
                fade
                zoom={{ initialScale: 0.8 }}
                delay={1.3}
                transition={{ duration: 0.5 }}
                className="from-background to-muted/30 absolute left-1/2 top-1/2 flex h-80 w-80 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl border-2 bg-gradient-to-br p-8 shadow-2xl"
              >
                <div className="relative h-full w-full">
                  <Icon
                    icon="solar:qr-code-bold"
                    className="text-primary absolute inset-0 h-full w-full opacity-20"
                  />
                  <div className="border-primary/30 absolute inset-4 rounded-xl border-4 border-dashed" />
                </div>
              </MotionPreset>

              {/* Stat Cards */}
              {QR_STATS.map((stat, index) => (
                <MotionPreset
                  key={index}
                  fade
                  motionProps={{
                    animate: {
                      y: [0, -12, 0],
                      opacity: 1,
                    },
                    transition: {
                      y: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5 + index * 0.2,
                      },
                      opacity: {
                        duration: 0.5,
                        delay: 1.5 + index * 0.2,
                      },
                    },
                  }}
                  className={`absolute ${
                    index === 0
                      ? "left-0 top-20"
                      : index === 1
                        ? "right-0 top-32"
                        : "bottom-20 left-1/2 -translate-x-1/2"
                  }`}
                >
                  <div className="bg-card flex w-64 flex-col gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color}`}
                      >
                        <Icon
                          icon={stat.icon}
                          className={`size-5 ${stat.iconColor}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs font-medium">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-green-600">
                      <Icon
                        icon="solar:arrow-up-bold"
                        className="mb-0.5 inline size-3"
                      />{" "}
                      {stat.changePercentage} this month
                    </div>
                  </div>
                </MotionPreset>
              ))}
            </MotionPreset>
          </div>
        </div>
      </div>
    </section>
  );
};
