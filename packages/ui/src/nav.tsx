"use client";

import { APP_DOMAIN, HIDE_BACKGROUND_SEGMENTS, cn, fetcher } from "@dub/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import va from "@vercel/analytics";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { createContext } from "react";
import useSWR from "swr";
import { FEATURES_LIST } from "./content";
import { useScroll } from "./hooks";
import { MaxWidthWrapper } from "./max-width-wrapper";
import { NavLogo } from "./nav-logo";

export type NavTheme = "light" | "dark";

export const NavContext = createContext<{ theme: NavTheme }>({
  theme: "light",
});

export const navItems = [
  {
    name: "Customers",
    slug: "customers",
  },
  {
    name: "Pricing",
    slug: "pricing",
  },
  // {
  //   name: "Enterprise",
  //   slug: "enterprise",
  // },
  {
    name: "Blog",
    slug: "blog",
  },
  {
    name: "Changelog",
    slug: "changelog",
  },
  {
    name: "Help Center",
    slug: "help",
  },
];

export function Nav({ theme = "light" }: { theme?: NavTheme }) {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const createHref = (href: string) =>
    domain === "dub.co" ? href : `https://dub.co${href}`;

  const scrolled = useScroll(80);
  const selectedLayout = useSelectedLayoutSegment();
  const { data: session, isLoading } = useSWR(
    domain === "dub.co" && "/api/auth/session",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <NavContext.Provider value={{ theme }}>
      <div
        className={cn(
          `sticky inset-x-0 top-0 z-30 w-full transition-all`,
          theme === "dark" && "dark",
        )}
      >
        <div
          className={cn(
            "-z-1 absolute inset-0 border-transparent transition-all",
            {
              "border-b border-black/10 bg-white/75 backdrop-blur-lg dark:border-white/10 dark:bg-black/75":
                scrolled,
              "border-b border-black/10 bg-white dark:border-white/10 dark:bg-black":
                selectedLayout &&
                HIDE_BACKGROUND_SEGMENTS.includes(selectedLayout),
            },
          )}
        />
        <MaxWidthWrapper className="relative">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-12">
              <Link
                href={createHref("/")}
                {...(domain !== "dub.co" && {
                  onClick: () => {
                    va.track("Referred from custom domain", {
                      domain,
                      medium: "logo",
                    });
                  },
                })}
              >
                <NavLogo />
              </Link>
              <NavigationMenuPrimitive.Root
                delayDuration={0}
                className="relative hidden lg:block"
              >
                <NavigationMenuPrimitive.List className="flex flex-row space-x-2 p-4">
                  <NavigationMenuPrimitive.Item>
                    <NavigationMenuPrimitive.Trigger className="group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 focus:outline-none dark:hover:bg-white/10">
                      <p
                        className={cn(
                          "text-sm font-medium text-gray-500 transition-colors ease-out group-hover:text-black dark:text-white/70 dark:group-hover:text-white",
                          {
                            "text-black dark:text-white":
                              selectedLayout === "features",
                          },
                        )}
                      >
                        Features
                      </p>
                      <ChevronDown className="h-4 w-4 text-black transition-all group-data-[state=open]:rotate-180 dark:text-white" />
                    </NavigationMenuPrimitive.Trigger>

                    <NavigationMenuPrimitive.Content>
                      <div className="grid w-[32rem] grid-cols-2 gap-1 p-3">
                        {FEATURES_LIST.map(
                          ({ slug, icon: Icon, title, shortTitle }) => (
                            <Link
                              key={slug}
                              href={createHref(`/${slug}`)}
                              {...(domain !== "dub.co" && {
                                onClick: () => {
                                  va.track("Referred from custom domain", {
                                    domain,
                                    medium: `navbar item (/${slug})`,
                                  });
                                },
                              })}
                              className="rounded-lg p-3 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-white/[0.15] dark:active:bg-white/20"
                            >
                              <div className="flex items-center space-x-2">
                                <Icon className="h-4 w-4 text-gray-700 dark:text-white/80" />
                                <p className="text-sm font-medium text-gray-700 dark:text-white">
                                  {shortTitle}
                                </p>
                              </div>
                              <p className="mt-1 line-clamp-1 text-sm text-gray-500 dark:text-white/60">
                                {title}
                              </p>
                            </Link>
                          ),
                        )}
                      </div>
                    </NavigationMenuPrimitive.Content>
                  </NavigationMenuPrimitive.Item>

                  {navItems.map(({ name, slug }) => (
                    <NavigationMenuPrimitive.Item key={slug} asChild>
                      <Link
                        id={`nav-${slug}`}
                        key={slug}
                        href={createHref(`/${slug}`)}
                        {...(domain !== "dub.co" && {
                          onClick: () => {
                            va.track("Referred from custom domain", {
                              domain,
                              medium: `navbar item (${slug})`,
                            });
                          },
                        })}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black dark:text-white/70 dark:hover:text-white",
                          {
                            "text-black dark:text-white":
                              selectedLayout === slug,
                          },
                        )}
                      >
                        {name}
                      </Link>
                    </NavigationMenuPrimitive.Item>
                  ))}
                </NavigationMenuPrimitive.List>

                <NavigationMenuPrimitive.Viewport className="data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content absolute left-0 top-full flex w-[var(--radix-navigation-menu-viewport-width)] origin-[top_center] justify-start rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.15] dark:bg-black" />
              </NavigationMenuPrimitive.Root>
            </div>

            <div className="hidden lg:block">
              {session && Object.keys(session).length > 0 ? (
                <Link
                  href={APP_DOMAIN}
                  className="animate-fade-in rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-gray-800 hover:ring-4 hover:ring-gray-200 dark:border-white dark:bg-white dark:text-gray-600 dark:hover:bg-white dark:hover:text-gray-800 dark:hover:hover:shadow-[0_0_25px_5px_rgba(256,256,256,0.2)] dark:hover:ring-0"
                >
                  Dashboard
                </Link>
              ) : !isLoading ? (
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
                    className="animate-fade-in rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black dark:text-white dark:hover:text-white/70"
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
                    className="animate-fade-in rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-gray-800 hover:ring-4 hover:ring-gray-200 dark:border-white dark:bg-white dark:text-gray-600 dark:hover:bg-white dark:hover:text-gray-800 dark:hover:hover:shadow-[0_0_25px_5px_rgba(256,256,256,0.2)] dark:hover:ring-0"
                  >
                    Sign Up
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </NavContext.Provider>
  );
}
