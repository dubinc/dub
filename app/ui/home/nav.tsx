"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import useScroll from "#/lib/hooks/use-scroll";
import { cn } from "#/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { APP_DOMAIN, SHOW_BACKGROUND_SEGMENTS } from "#/lib/constants";
import va from "@vercel/analytics";
import { LogoType } from "../icons";

const navItems = [
  {
    name: "Pricing",
    segment: "pricing",
  },
  {
    name: "Changelog",
    segment: "changelog",
  },
  {
    name: "Help Center",
    segment: "help",
  },
];

export default function Nav() {
  const { domain = "dub.sh" } = useParams() as { domain: string };

  const scrolled = useScroll(80);
  const selectedLayout = useSelectedLayoutSegment();
  const helpCenter = selectedLayout === "help";

  return (
    <div
      className={cn(`sticky inset-x-0 top-0 z-30 w-full transition-all`, {
        "border-b border-gray-200 bg-white/75 backdrop-blur-lg": scrolled,
        "border-b border-gray-200 bg-white":
          selectedLayout && !SHOW_BACKGROUND_SEGMENTS.has(selectedLayout),
      })}
    >
      <MaxWidthWrapper
        {...(helpCenter && {
          className: "max-w-screen-lg",
        })}
      >
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href={domain === "dub.sh" ? "/" : `https://dub.sh`}
              {...(domain !== "dub.sh" && {
                onClick: () => {
                  va.track("Referred from custom domain", {
                    domain,
                    medium: "logo",
                  });
                },
              })}
            >
              <LogoType />
            </Link>
            {helpCenter && (
              <div className="flex items-center">
                <div className="mr-3 h-5 border-l-2 border-gray-400" />
                <Link
                  href="/help"
                  className="font-display text-lg font-bold text-gray-700"
                >
                  Help Center
                </Link>
              </div>
            )}
          </div>

          <div className="hidden items-center space-x-2 sm:flex">
            {!helpCenter &&
              navItems.map(({ name, segment }) => (
                <Link
                  id={`nav-${segment}`}
                  key={segment}
                  href={
                    domain === "dub.sh"
                      ? `/${segment}`
                      : `https://dub.sh/${segment}`
                  }
                  {...(domain !== "dub.sh" && {
                    onClick: () => {
                      va.track("Referred from custom domain", {
                        domain,
                        medium: `navbar item (${segment})`,
                      });
                    },
                  })}
                  className={cn(
                    "z-10 rounded-full px-4 py-1.5 text-sm font-medium capitalize text-gray-500 transition-colors ease-out hover:text-black",
                    {
                      "text-black": selectedLayout === segment,
                    },
                  )}
                >
                  {name}
                </Link>
              ))}
            <Link
              href={`${APP_DOMAIN}/login`}
              {...(domain !== "dub.sh" && {
                onClick: () => {
                  va.track("Referred from custom domain", {
                    domain,
                    medium: `navbar item (login)`,
                  });
                },
              })}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
            >
              Log in
            </Link>
            <Link
              href={`${APP_DOMAIN}/register`}
              {...(domain !== "dub.sh" && {
                onClick: () => {
                  va.track("Referred from custom domain", {
                    domain,
                    medium: `navbar item (signup)`,
                  });
                },
              })}
              className="rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
