import { CustomerSupport } from "@/ui/landing/footer/components/customer-support.tsx";
import { Links } from "@/ui/landing/footer/components/links.tsx";
import { Payments } from "@/ui/landing/footer/components/payments.tsx";
import { SocialMedia } from "@/ui/landing/footer/components/social-media.tsx";
import { Logo } from "@/ui/shared/logo";
import {
  GENERAL_LINKS,
  LEGAL_LINKS,
} from "../../../app/app.dub.co/(public)/constants/types.ts";

export const Footer = () => (
  <footer className="mt-auto w-full">
    <div className="bg-primary-100 mt-10 w-full py-6 md:mt-16 lg:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col max-[1320px]:px-6 max-md:px-4">
        <div className="flex flex-col items-start justify-end md:flex-row">
          <div className="mr-auto flex flex-col justify-start gap-4">
            <Logo />
            <SocialMedia />
          </div>
          <CustomerSupport />
          <div className="mb-6 flex flex-col gap-4 max-md:mt-6 md:flex-row md:gap-20 lg:mb-12">
            <div>
              <Links title="Legal" links={LEGAL_LINKS} />
            </div>
            <div>
              <Links title="About Us" links={GENERAL_LINKS} />
            </div>
          </div>
        </div>
        <hr className="my-6 bg-gray-500" />
        <div className="flex w-full flex-col justify-between gap-4">
          <Payments />
          <div className="flex flex-col gap-2 md:gap-2.5">
            <p className="text-left text-sm text-neutral-200">
              © GetQR - 2025. All rights reserved. Create your own QR codes and
              promote your business or idea.
            </p>
            <p className="text-left text-sm text-neutral-200">
              30 N Gould St Ste R Sheridan, WY 82801 USA
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
