"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CustomerSupport } from "@/ui/landing/components/footer/components/customer-support.tsx";
import { Links } from "@/ui/landing/components/footer/components/links.tsx";
import { Payments } from "@/ui/landing/components/footer/components/payments.tsx";
import { USAFlag } from "@/ui/landing/components/footer/components/usa-flag.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
import { GENERAL_LINKS, LEGAL_LINKS } from "constants/links";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { FC, useCallback } from "react";

interface IFooterProps {
  sessionId: string;
}

export const Footer: FC<Readonly<IFooterProps>> = ({ sessionId }) => {
  const handleScrollToQRGenerationBlock = useCallback(() => {
    const qrGenerationBlock = document.getElementById("qr-generation-block");
    if (qrGenerationBlock) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_CLICKED,
        params: {
          page_name: "landing",
          content_value: "create_qr",
          content_group: "footer",
          event_category: "nonAuthorized",
        },
        sessionId,
      });
      qrGenerationBlock.scrollIntoView({ behavior: "smooth" });
    }
  }, [sessionId]);

  return (
    <footer>
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-16 md:py-24 lg:flex-row lg:justify-between lg:gap-12">
        <div className="flex flex-col items-start gap-6 lg:max-w-sm">
          <div className="flex items-center gap-2">
            <Logo />
          </div>

          <h3 className="text-xl font-semibold text-neutral-900">
            Ready to get started?
          </h3>

          <div suppressHydrationWarning>
            <Button
              onClick={handleScrollToQRGenerationBlock}
              className="bg-secondary hover:bg-secondary/90"
              size="lg"
            >
              Create QR code
            </Button>
          </div>

          <div className="text-xs text-neutral-500">
            <p className="flex items-center gap-2">
              <span>Designed in Philadelphia, USA</span>
              <USAFlag className="h-5 w-5" />
            </p>
            <p>
              2093 Philadelphia Pike #3129, Claymont, DE 19703, USA
            </p>
          </div>
        </div>

        {/* Right side columns with equal spacing */}
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-12 lg:gap-16">
          {/* Customer Support */}
          <div className="flex w-max flex-col">
            <CustomerSupport sessionId={sessionId} />
          </div>

          {/* Legal Links */}
          <div className="flex w-max flex-col">
            <Links title="Legal" links={LEGAL_LINKS} sessionId={sessionId} />
          </div>

          {/* About Us Links */}
          <div className="flex w-max flex-col">
            <Links
              title="About Us"
              links={GENERAL_LINKS}
              sessionId={sessionId}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Bottom section with copyright and payments */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <p className="text-sm text-neutral-600">
          © GetQR - {new Date().getFullYear()}. All rights reserved.
        </p>
        <Payments />
      </div>
    </footer>
  );
};
