"use client";

import { Tooltip, Button } from "ui";
export { Tooltip as default } from "ui";
import Link from "next/link";
import { ReactNode, useState } from "react";
import Script from "next/script";
import { ExternalLink, HelpCircle } from "lucide-react";
import { DomainProps } from "#/lib/types";
import { CheckCircleFill, XCircleFill } from "@/components/shared/icons";

export function TooltipContent({
  title,
  cta,
  href,
  target,
  onClick,
}: {
  title: string;
  cta?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center space-y-3 p-4 text-center md:max-w-xs">
      <p className="text-sm text-gray-700">{title}</p>
      {cta &&
        (href ? (
          <Link
            href={href}
            {...(target ? { target } : {})}
            className="mt-4 w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
          >
            {cta}
          </Link>
        ) : onClick ? (
          <button
            type="button"
            className="mt-4 w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
            onClick={onClick}
          >
            {cta}
          </button>
        ) : null)}
    </div>
  );
}

export function SimpleTooltipContent({
  title,
  cta,
  href,
}: {
  title: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="max-w-xs px-4 py-2 text-center text-sm text-gray-700">
      {title}{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-gray-500 underline underline-offset-4 hover:text-gray-800"
      >
        {cta}
      </a>
    </div>
  );
}

export function InfoTooltip({ content }: { content: ReactNode | string }) {
  return (
    <Tooltip content={content}>
      <HelpCircle className="h-4 w-4 text-gray-500" />
    </Tooltip>
  );
}

export function SSOWaitlist() {
  const [opening, setOpening] = useState(false);
  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />

      <div className="flex max-w-sm flex-col items-center space-y-3 p-4 text-center">
        <h3 className="font-semibold text-gray-800">SAML/SSO</h3>
        <p className="text-sm text-gray-600">
          SAML/SSO is coming soon. Interested in early access? Join the
          waitlist.
        </p>

        <Button
          text="Join waitlist"
          loading={opening}
          onClick={() => {
            setOpening(true);
            // @ts-ignore
            window.Tally?.openPopup("waexqB", {
              width: 540,
              onOpen: () => setOpening(false),
            });
          }}
        />
      </div>
    </>
  );
}

export function DomainsTooltip({
  domains,
  title,
  cta,
  href,
}: {
  domains: DomainProps[];
  title: string;
  cta?: string;
  href: string;
}) {
  return (
    <div
      className="flex w-full flex-col items-center space-y-2 p-4 md:w-60"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-2 text-sm text-gray-500">{title}</p>
      <div className="flex w-full flex-col">
        {domains.map(({ slug, verified }) => (
          <a
            key={slug}
            href={`https://${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-md p-2 transition-all hover:bg-gray-100"
          >
            <div className="flex items-center space-x-1">
              {verified ? (
                <CheckCircleFill className="h-5 w-5 text-blue-500" />
              ) : (
                <XCircleFill className="h-5 w-5 text-gray-300" />
              )}
              <p className="text-sm font-semibold text-gray-500">{slug}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-500 md:invisible md:group-hover:visible" />
          </a>
        ))}
      </div>

      <div className="mt-2 w-full px-2">
        <Link
          href={href}
          className="block rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
