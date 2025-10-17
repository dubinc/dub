import { CustomerSupport } from "@/ui/landing/components/footer/components/customer-support.tsx";
import { Links } from "@/ui/landing/components/footer/components/links.tsx";
import { Payments } from "@/ui/landing/components/footer/components/payments.tsx";
import { SocialMedia } from "@/ui/landing/components/footer/components/social-media.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
import { Separator } from "@/components/ui/separator";
import { GENERAL_LINKS, LEGAL_LINKS } from "constants/links";
import { FC } from "react";

interface IFooterProps {
  sessionId: string;
}

export const Footer: FC<Readonly<IFooterProps>> = ({ sessionId }) => (
  <footer>
    <Separator />
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-16 md:py-24 lg:flex-row lg:justify-between lg:gap-12">
      {/* Logo and Social Media */}
      <div className="flex flex-col items-start gap-4 lg:max-w-sm">
        <Logo />
        <p className="text-muted-foreground text-balance">
          Create your own QR codes and promote your business or idea.
        </p>
        <SocialMedia />
      </div>

      {/* Right side columns with equal spacing */}
      <div className="flex flex-col gap-8 sm:flex-row sm:gap-12 lg:gap-16">
        {/* Customer Support */}
        <div className="flex flex-col w-max">
          <CustomerSupport sessionId={sessionId} />
        </div>

        {/* Legal Links */}
        <div className="flex flex-col w-max">
          <Links title="Legal" links={LEGAL_LINKS} sessionId={sessionId} />
        </div>

        {/* About Us Links */}
        <div className="flex flex-col w-max">
          <Links title="About Us" links={GENERAL_LINKS} sessionId={sessionId} />
        </div>
      </div>
    </div>

    <Separator />

    {/* Copyright and Payments */}
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
      <p className="font-medium text-sm sm:text-base">
        © GetQR - {new Date().getFullYear()}. All rights reserved.
      </p>

      <Payments />
    </div>
  </footer>
);
