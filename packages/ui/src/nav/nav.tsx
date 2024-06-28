"use client";

import { APP_DOMAIN, HIDE_BACKGROUND_SEGMENTS, cn, fetcher } from "@dub/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import va from "@vercel/analytics";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { PropsWithChildren, createContext } from "react";
import useSWR from "swr";
import { FEATURES_LIST } from "../content";
import { useScroll } from "../hooks";
import { MaxWidthWrapper } from "../max-width-wrapper";
import { NavLogo } from "../nav-logo";

export type NavTheme = "light" | "dark";

export const NavContext = createContext<{ theme: NavTheme }>({
  theme: "light",
});

export const navItems = [
  {
    name: "Product",
    href: "/",
    content: ProductContent,
  },
  {
    name: "Solutions",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Resources",
  },
];

const navItemStyles = cva(
  [
    "block rounded-md px-3 py-1.5 text-sm text-gray-900/60 hover:text-gray-900/80",
    "dark:text-white/70 dark:hover:text-white",
    "transition-colors ease-out",
  ],
  {
    variants: {
      isActive: {
        true: "text-gray-900/80 dark:text-white",
      },
    },
  },
);

const createHref = (href: string, domain: string) =>
  domain === "dub.co" ? href : `https://dub.co${href}`;

export function Nav({ theme = "light" }: { theme?: NavTheme }) {
  const { domain = "dub.co" } = useParams() as { domain: string };

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
              // "bg-white/75 backdrop-blur-lg dark:bg-black/75": scrolled,
              // "bg-white dark:bg-black":
              //   selectedLayout &&
              //   HIDE_BACKGROUND_SEGMENTS.includes(selectedLayout),
            },
          )}
        />
        <MaxWidthWrapper className="relative">
          <div className="flex h-14 items-center justify-between">
            <Link
              className="grow basis-0"
              href={createHref("/", domain)}
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
              <NavigationMenuPrimitive.List className="relative flex flex-row gap-2 px-2 py-0.5">
                <div className="absolute inset-0 -z-[1]">
                  <div
                    className={cn(
                      "absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white drop-shadow-sm transition-all dark:border-white/10 dark:bg-black",
                      scrolled && [
                        "h-14 w-screen rounded-none drop-shadow-none",
                        (!selectedLayout ||
                          !HIDE_BACKGROUND_SEGMENTS.includes(selectedLayout)) &&
                          "bg-white/75 backdrop-blur-lg dark:bg-black/75",
                      ],
                    )}
                  />
                </div>
                {navItems.map(({ name, href, content: Content }) => {
                  const isActive = href === `/${selectedLayout}`;
                  console.log(href);
                  return (
                    <NavigationMenuPrimitive.Item key={href}>
                      <WithTrigger trigger={!!Content}>
                        {href !== undefined ? (
                          <Link
                            id={`nav-${href}`}
                            key={href}
                            href={createHref(href, domain) ?? "/test"}
                            className={navItemStyles({ isActive })}
                            {...(domain !== "dub.co" && {
                              onClick: () => {
                                va.track("Referred from custom domain", {
                                  domain,
                                  medium: `navbar item (${href})`,
                                });
                              },
                            })}
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className={navItemStyles({ isActive })}>
                            {name}
                          </span>
                        )}
                      </WithTrigger>

                      {Content && (
                        <NavigationMenuPrimitive.Content>
                          <Content domain={domain} />
                        </NavigationMenuPrimitive.Content>
                      )}
                    </NavigationMenuPrimitive.Item>
                  );
                })}
              </NavigationMenuPrimitive.List>

              <NavigationMenuPrimitive.Viewport className="data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content absolute left-0 top-full mt-3 flex w-[var(--radix-navigation-menu-viewport-width)] origin-[top_center] justify-start rounded-[20px] border border-gray-200 bg-white/80 shadow-md backdrop-blur-md dark:border-white/[0.15] dark:bg-black/40" />
            </NavigationMenuPrimitive.Root>

            <div className="hidden grow basis-0 justify-end lg:flex">
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

function WithTrigger({
  trigger,
  children,
}: PropsWithChildren<{ trigger: boolean }>) {
  return trigger ? (
    <NavigationMenuPrimitive.Trigger asChild>
      {children}
    </NavigationMenuPrimitive.Trigger>
  ) : (
    children
  );
}

function ProductContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[32rem] grid-cols-2 gap-1 p-3">
      {FEATURES_LIST.map(({ slug, icon: Icon, title, shortTitle }) => (
        <Link
          key={slug}
          href={createHref(`/${slug}`, domain)}
          {...(domain !== "dub.co" && {
            onClick: () => {
              va.track("Referred from custom domain", {
                domain,
                medium: `navbar item (/${slug})`,
              });
            },
          })}
          className="group rounded-[8px] p-2 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-white/[0.15] dark:active:bg-white/20"
        >
          <div className="flex items-center gap-2">
            <div className="shrink-0 rounded-[10px] border border-gray-200 bg-white/50 p-3">
              <Icon className="h-4 w-4 text-black transition-transform group-hover:scale-110 dark:text-white/80" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-white">
                {shortTitle}
              </p>
              <p className="line-clamp-1 text-xs text-gray-500/80 dark:text-white/60">
                {title}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
