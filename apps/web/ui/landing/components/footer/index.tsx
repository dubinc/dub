"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CustomerSupport } from "@/ui/landing/components/footer/components/customer-support.tsx";
import { Links } from "@/ui/landing/components/footer/components/links.tsx";
import { Payments } from "@/ui/landing/components/footer/components/payments.tsx";
import { SocialMedia } from "@/ui/landing/components/footer/components/social-media.tsx";
import { USAFlag } from "@/ui/landing/components/footer/components/usa-flag.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
import { GENERAL_LINKS, LEGAL_LINKS } from "constants/links";
import { EQRType } from "@/ui/qr-builder-new/constants/get-qr-config.ts";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import Link from "next/link";
import { FC, useCallback } from "react";

const PRODUCT_LINKS = [
  { text: "Website QR Code", qrType: EQRType.WEBSITE },
  { text: "PDF QR Code", qrType: EQRType.PDF },
  { text: "Image QR Code", qrType: EQRType.IMAGE },
  { text: "Video QR Code", qrType: EQRType.VIDEO },
  { text: "WhatsApp QR Code", qrType: EQRType.WHATSAPP },
  { text: "WiFi QR Code", qrType: EQRType.WIFI },
];

const FEATURES_LINKS = [
  { text: "Full QR Customization", feature: "full-customization" },
  { text: "Dynamic & Editable QR codes", feature: "dynamic-&-editable" },
  { text: "Advanced QR Analytics", feature: "advanced-analytics" },
  { text: "High Quality QR Downloads", feature: "high-quality-downloads" },
];

const COMPANY_LINKS = [
  { href: "/pricing", text: "Pricing", page_name_code: "pricing" },
  { href: "#reviews", text: "Reviews", page_name_code: "reviews" },
  { href: "/help", text: "Help Center", page_name_code: "help" },
  { href: "/help/cancel-my-subscription", text: "How to Cancel", page_name_code: "how_to_cancel" },
];

interface IFooterProps {
  sessionId: string;
  handleScrollButtonClick: (type: "1" | "2" | "3", scrollTo?: EQRType) => void;
  handleFeatureClick: (feature: string) => void;
}

export const Footer: FC<Readonly<IFooterProps>> = ({
  sessionId,
  handleScrollButtonClick,
  handleFeatureClick,
}) => {
  const handleScrollToQRGenerationBlock = useCallback(() => {
    handleScrollButtonClick("1");
  }, [handleScrollButtonClick]);

  const handleProductClick = useCallback(
    (qrType: EQRType) => {
      handleScrollButtonClick("2", qrType);
    },
    [handleScrollButtonClick],
  );

  const handleCompanyLinkClick = useCallback(
    (href: string, pageNameCode?: string) => {
      if (href.startsWith("#")) {
        const sectionId = href.substring(1);
        const section = document.getElementById(sectionId);
        if (section) {
          if (pageNameCode) {
            trackClientEvents({
              event: EAnalyticEvents.PAGE_CLICKED,
              params: {
                page_name: "landing",
                content_value: pageNameCode,
                event_category: "nonAuthorized",
              },
              sessionId,
            });
          }
          section.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [sessionId],
  );

  return (
    <footer>
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:flex-row lg:justify-between lg:gap-12">
        <div className="flex flex-col items-start gap-4 lg:max-w-sm">
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
              <span className="font-bold text-sm">Designed in USA</span>
              <USAFlag className="h-5 w-5" />
            </p>
            <p>
              2093 Philadelphia Pike #3129, Claymont, DE 19703
            </p>
          </div>
        </div>

        {/* Right side columns with equal spacing */}
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10 lg:gap-12">
          {/* Product Links */}
          <div className="flex w-max flex-col">
            <div className="flex flex-col gap-4">
              <div className="text-lg font-medium">Product</div>
              <ul className="text-muted-foreground space-y-2">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.qrType}>
                    <button
                      onClick={() => handleProductClick(link.qrType)}
                      className="text-left transition-colors hover:text-foreground"
                    >
                      {link.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Features Links */}
          <div className="flex w-max flex-col">
            <div className="flex flex-col gap-4">
              <div className="text-lg font-medium">Features</div>
              <ul className="text-muted-foreground space-y-2">
                {FEATURES_LINKS.map((link) => (
                  <li key={link.text}>
                    <button
                      onClick={() => {
                        handleFeatureClick(link.feature);
                        trackClientEvents({
                          event: EAnalyticEvents.PAGE_CLICKED,
                          params: {
                            page_name: "landing",
                            content_value: link.feature,
                            content_group: "footer",
                            event_category: "nonAuthorized",
                          },
                          sessionId,
                        });
                      }}
                      className="cursor-pointer text-left transition-colors hover:text-foreground"
                    >
                      {link.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex w-max flex-col">
            <Links title="Legal" links={LEGAL_LINKS} sessionId={sessionId} />
          </div>

          {/* Company Links */}
          <div className="flex w-max flex-col">
            <div className="flex flex-col gap-4">
              <div className="text-lg font-medium">Company</div>
              <ul className="text-muted-foreground space-y-2">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.text}>
                    {link.href.startsWith("#") ? (
                      <button
                        onClick={() =>
                          handleCompanyLinkClick(link.href, link.page_name_code)
                        }
                        className="cursor-pointer text-left transition-colors hover:text-foreground"
                      >
                        {link.text}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        target="_blank"
                        onClick={() => {
                          if (link.page_name_code) {
                            trackClientEvents({
                              event: EAnalyticEvents.PAGE_CLICKED,
                              params: {
                                page_name: "landing",
                                content_value: link.page_name_code,
                                event_category: "nonAuthorized",
                              },
                              sessionId,
                            });
                          }
                        }}
                        className="transition-colors hover:text-foreground"
                      >
                        {link.text}
                      </Link>
                    )}
                  </li>
                ))}
                <li>
                  <CustomerSupport sessionId={sessionId} />
                </li>
            </ul>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bottom section with copyright and payments */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-2 sm:px-6 pb-0">
        <div className="flex items-center gap-4">
          <p className="text-sm text-neutral-600">
            © GetQR - {new Date().getFullYear()}. All rights reserved.
          </p>
          <SocialMedia sessionId={sessionId} />
        </div>
        <Payments />
      </div>
    </footer>
  );
};
