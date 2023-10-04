"use client";

import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import useScroll from "#/lib/hooks/use-scroll";
import { cn } from "#/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { APP_DOMAIN, SHOW_BACKGROUND_SEGMENTS } from "#/lib/constants";
import va from "@vercel/analytics";
import { ChevronDown } from "lucide-react";
import { LogoType } from "#/ui/icons";
import { useSession } from "next-auth/react";
import { FEATURES_LIST } from "#/lib/constants/content";

export const navItems = [
  {
    name: "Customers",
    slug: "customers",
  },
  {
    name: "Changelog",
    slug: "changelog",
  },
  {
    name: "Help",
    slug: "help",
  },
  {
    name: "Pricing",
    slug: "pricing",
  },
];

export default function Nav() {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const scrolled = useScroll(80);
  const selectedLayout = useSelectedLayoutSegment();
  const helpCenter = selectedLayout === "help";
  const { data: session, status } =
    domain === "dub.co"
      ? useSession()
      : {
          data: null,
          status: "unauthenticated", // if `useSession` is undefined, we're on a non dub.co domain
        };

  return (
    <div
      className={cn(`sticky inset-x-0 top-0 z-30 w-full transition-all`, {
        "border-b border-gray-200 bg-white/75 backdrop-blur-lg": scrolled,
        "border-b border-gray-200 bg-white":
          selectedLayout && !SHOW_BACKGROUND_SEGMENTS.includes(selectedLayout),
      })}
    >
      <MaxWidthWrapper
        {...(helpCenter && {
          className: "max-w-screen-lg",
        })}
      >
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={domain === "dub.co" ? "/" : `https://dub.co`}
              {...(domain !== "dub.co" && {
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
            {helpCenter ? (
              <div className="flex items-center">
                <div className="mr-3 h-5 border-l-2 border-gray-400" />
                <Link
                  href="/help"
                  className="font-display text-lg font-bold text-gray-700"
                >
                  Help Center
                </Link>
              </div>
            ) : (
              <NavigationMenuPrimitive.Root
                delayDuration={0}
                className="relative hidden lg:block"
              >
                <NavigationMenuPrimitive.List className="flex flex-row space-x-2 p-4">
                  <NavigationMenuPrimitive.Item>
                    <NavigationMenuPrimitive.Trigger className="group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 focus:outline-none">
                      <p
                        className={cn(
                          "text-sm font-medium text-gray-500 transition-colors ease-out group-hover:text-black",
                          {
                            "text-black": selectedLayout === "features",
                          },
                        )}
                      >
                        Features
                      </p>
                      <ChevronDown className="h-4 w-4 transition-all group-data-[state=open]:rotate-180" />
                    </NavigationMenuPrimitive.Trigger>

                    <NavigationMenuPrimitive.Content>
                      <div className="grid w-[32rem] grid-cols-2 gap-1 p-3">
                        {FEATURES_LIST.map((feature) => (
                          <Link
                            key={feature.slug}
                            href={
                              domain === "dub.co"
                                ? `/features/${feature.slug}`
                                : `https://dub.co/features/${feature.slug}`
                            }
                            {...(domain !== "dub.co" && {
                              onClick: () => {
                                va.track("Referred from custom domain", {
                                  domain,
                                  medium: `navbar item (features/${feature.slug})`,
                                });
                              },
                            })}
                            className="rounded-lg p-3 transition-colors hover:bg-gray-100 active:bg-gray-200"
                          >
                            <div className="flex items-center space-x-2">
                              <feature.icon className="h-4 w-4 text-gray-700" />
                              <p className="text-sm font-medium text-gray-700">
                                {feature.shortTitle}
                              </p>
                            </div>
                            <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                              {feature.title}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </NavigationMenuPrimitive.Content>
                  </NavigationMenuPrimitive.Item>

                  {navItems.map(({ name, slug }) => (
                    <NavigationMenuPrimitive.Item key={slug} asChild>
                      <Link
                        id={`nav-${slug}`}
                        key={slug}
                        href={
                          domain === "dub.co"
                            ? `/${slug}`
                            : `https://dub.co/${slug}`
                        }
                        {...(domain !== "dub.co" && {
                          onClick: () => {
                            va.track("Referred from custom domain", {
                              domain,
                              medium: `navbar item (${slug})`,
                            });
                          },
                        })}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black",
                          {
                            "text-black": selectedLayout === slug,
                          },
                        )}
                      >
                        {name}
                      </Link>
                    </NavigationMenuPrimitive.Item>
                  ))}
                </NavigationMenuPrimitive.List>

                <NavigationMenuPrimitive.Viewport className="absolute left-0 top-full flex w-[var(--radix-navigation-menu-viewport-width)] origin-[top_center] justify-start rounded-lg border border-gray-200 bg-white shadow-lg data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content" />
              </NavigationMenuPrimitive.Root>
            )}
          </div>

          <div className="hidden lg:block">
            {session ? (
              <Link
                href={APP_DOMAIN}
                className="animate-fade-in rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Dashboard
              </Link>
            ) : status === "unauthenticated" ? (
              <>
                <Link
                  href={`${APP_DOMAIN}/login`}
                  {...(domain !== "dub.co" && {
                    onClick: () => {
                      va.track("Referred from custom domain", {
                        domain,
                        medium: `navbar item (login)`,
                      });
                    },
                  })}
                  className="animate-fade-in rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
                >
                  Log in
                </Link>
                <Link
                  href={`${APP_DOMAIN}/register`}
                  {...(domain !== "dub.co" && {
                    onClick: () => {
                      va.track("Referred from custom domain", {
                        domain,
                        medium: `navbar item (signup)`,
                      });
                    },
                  })}
                  className="animate-fade-in rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
                >
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
