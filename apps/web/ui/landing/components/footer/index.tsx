import { CustomerSupport } from "@/ui/landing/components/footer/components/customer-support.tsx";
import { Links } from "@/ui/landing/components/footer/components/links.tsx";
import { Payments } from "@/ui/landing/components/footer/components/payments.tsx";
import { SocialMedia } from "@/ui/landing/components/footer/components/social-media.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
import { GENERAL_LINKS, LEGAL_LINKS } from "constants/links";
import { FC } from "react";

interface IFooterProps {
  sessionId: string;
}

export const Footer: FC<Readonly<IFooterProps>> = ({ sessionId }) => (
  <footer className="mt-auto w-full">
    <div className="border-t-border-300 bg-primary-100 w-full border-t py-6 lg:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col max-[1320px]:px-6 max-md:px-4">
        <div className="flex flex-col items-start justify-end md:flex-row">
          <div className="mr-auto flex flex-col justify-start gap-4">
            <Logo />
            <SocialMedia />
          </div>
          <CustomerSupport sessionId={sessionId} />
          <div className="flex flex-col gap-4 max-md:mt-6 md:flex-row md:gap-20">
            <div>
              <Links title="Legal" links={LEGAL_LINKS} sessionId={sessionId} />
            </div>
            <div>
              <Links
                title="About Us"
                links={GENERAL_LINKS}
                sessionId={sessionId}
              />
            </div>
          </div>
        </div>
        <hr className="my-6 bg-gray-500" />
        <div className="flex w-full flex-col justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-left text-sm text-neutral-200">
              © GetQR - {new Date().getFullYear()}. All rights reserved. Create
              your own QR codes and promote your business or idea.
            </p>
            {/*<p className="text-left text-sm text-neutral-200">*/}
            {/*  30 N Gould St Ste R Sheridan, WY 82801 USA*/}
            {/*</p>*/}
          </div>
          <Payments />
        </div>
      </div>
    </div>
  </footer>
);
