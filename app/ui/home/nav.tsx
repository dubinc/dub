"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import useScroll from "#/lib/hooks/use-scroll";
import { cn } from "#/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { APP_DOMAIN } from "#/lib/constants";
import va from "@vercel/analytics";
import { LogoType } from "#/ui/icons";

const navItems = ["pricing", "changelog"];

const transparentHeaderSegments = new Set(["metatags", "pricing"]);

export default function Nav() {
  const { domain = "dub.sh" } = useParams() as { domain: string };

  const scrolled = useScroll(80);
  const segment = useSelectedLayoutSegment();

  return (
    <div
      className={cn(`sticky inset-x-0 top-0 z-30 w-full transition-all`, {
        "border-b border-gray-200 bg-white/75 backdrop-blur-lg": scrolled,
        "border-b border-gray-200 bg-white":
          segment && !transparentHeaderSegments.has(segment),
      })}
    >
      <MaxWidthWrapper>
        <div className="flex h-14 items-center justify-between">
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

          <div className="hidden items-center space-x-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item}
                href={
                  domain === "dub.sh" ? `/${item}` : `https://dub.sh/${item}`
                }
                {...(domain !== "dub.sh" && {
                  onClick: () => {
                    va.track("Referred from custom domain", {
                      domain,
                      medium: `navbar item (${item})`,
                    });
                  },
                })}
                className={`rounded-md text-sm font-medium capitalize ${
                  segment === item ? "text-black" : "text-gray-500"
                } transition-colors ease-out hover:text-black`}
              >
                {item}
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
              className="rounded-md text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
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
