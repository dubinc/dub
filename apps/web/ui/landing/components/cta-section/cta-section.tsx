"use client";

import { AvatarGroup } from "@/components/ui/avatar-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MotionPreset } from "@/components/ui/motion-preset";
import WebsiteQR from "@/ui/landing/assets/png/get-qr-website-full.png";
import WhatsappQR from "@/ui/landing/assets/png/get-qr-whatsapp-full.png";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import { FC } from "react";

interface ICTASectionProps {
  handleScrollButtonClick: (type: "1" | "2" | "3") => void;
}

export const CTASection: FC<ICTASectionProps> = ({
  handleScrollButtonClick,
}) => {
  return (
    <section className="relative py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="group relative overflow-hidden rounded-3xl border-2 shadow">
          {/* Animated gradient background */}
          <div className="from-background to-muted/30 absolute inset-0 bg-gradient-to-br" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

          {/* Decorative blobs */}
          <div className="bg-primary/10 absolute -right-20 -top-20 h-72 w-72 animate-pulse rounded-full blur-3xl" />
          <div className="bg-secondary/10 absolute -bottom-20 -left-20 h-72 w-72 animate-pulse rounded-full blur-3xl delay-700" />

          <CardContent className="relative flex items-center gap-8 px-6 py-12 sm:max-lg:flex-col md:gap-16 md:px-12 lg:py-14">
            {/* Images Section */}
            <MotionPreset
              className="relative w-full max-sm:hidden"
              fade
              motionProps={{
                animate: {
                  y: [0, -10, 0],
                  opacity: 1,
                },
                transition: {
                  y: {
                    duration: 1.7,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5,
                  },
                },
              }}
            >
              <div className="flex gap-3 max-lg:mx-auto max-lg:max-h-80 lg:absolute lg:-translate-y-1/2 lg:scale-105">
                {/* First Image - Higher with sparkle */}
                <div className="relative">
                  <div className="absolute -right-2 -top-2 z-10 rounded-full bg-gradient-to-br from-blue-500/80 to-blue-600/80 p-1.5 shadow-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-card relative w-32 -translate-y-4 overflow-hidden rounded-2xl border-2 border-gray-200 p-2 shadow backdrop-blur-sm transition-transform duration-300 hover:scale-105 sm:w-40">
                    <Image
                      src={WebsiteQR}
                      alt="Website QR Code"
                      className="h-full w-full rounded-lg object-contain"
                      priority
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 to-blue-600/10 blur-xl" />
                  </div>
                </div>

                {/* Second Image - Lower with badge */}
                <div className="relative">
                  <div className="absolute -left-2 -top-2 z-10 rounded-full bg-gradient-to-br from-green-500/80 to-green-600/80 p-1.5 shadow-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-card relative w-32 translate-y-4 overflow-hidden rounded-2xl border-2 border-gray-200 p-2 shadow-2xl backdrop-blur-sm transition-transform duration-300 hover:scale-105 sm:w-40">
                    <Image
                      src={WhatsappQR}
                      alt="WhatsApp QR Code"
                      className="h-full w-full rounded-lg object-contain"
                      priority
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-green-500/10 to-green-600/10 blur-xl" />
                  </div>
                </div>
              </div>
            </MotionPreset>

            <div className="relative z-10 flex w-full max-w-2xl flex-col justify-center space-y-4 xl:justify-self-end">
              {/* Social Proof */}
              <MotionPreset
                fade
                slide={{ direction: "up", offset: 30 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <AvatarGroup />
                  <span className="text-sm font-medium text-gray-600">
                    Join 1M+ users
                  </span>
                </div>
              </MotionPreset>

              <MotionPreset
                component="h2"
                className="text-center text-2xl font-bold sm:text-left sm:text-3xl lg:text-4xl"
                fade
                blur
                slide={{ direction: "up", offset: 50 }}
                transition={{ duration: 0.5 }}
              >
                Ready to Create Your
                <br />
                <span className="text-primary">Perfect QR Code?</span>
              </MotionPreset>

              <MotionPreset
                component="p"
                className="text-muted-foreground text-center text-sm sm:text-left sm:text-base"
                fade
                blur
                slide={{ direction: "up", offset: 50 }}
                delay={0.2}
                transition={{ duration: 0.5 }}
              >
                Start generating professional, trackable QR codes in seconds
              </MotionPreset>

              <MotionPreset
                fade
                blur
                slide={{ direction: "up", offset: 50 }}
                delay={0.4}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:items-start">
                  <Button
                    className="bg-secondary hover:bg-secondary/90 group/btn font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                    size="lg"
                    onClick={() => handleScrollButtonClick("2")}
                  >
                    <span className="flex items-center gap-2">
                      Create QR Code
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                  </Button>
                </div>
              </MotionPreset>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
