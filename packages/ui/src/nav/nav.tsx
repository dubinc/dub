"use client";

import {
  APP_DOMAIN,
  HIDE_BACKGROUND_SEGMENTS,
  cn,
  createHref,
  fetcher,
} from "@dub/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { PropsWithChildren, createContext } from "react";
import useSWR from "swr";
import { FEATURES_LIST, RESOURCES, SDKS } from "../content";
import { useScroll } from "../hooks";
import { MaxWidthWrapper } from "../max-width-wrapper";
import { NavLogo } from "../nav-logo";
import { ProductContent } from "./content/product-content";
import { ResourcesContent } from "./content/resources-content";
import { SolutionsContent } from "./content/solutions-content";

export type NavTheme = "light" | "dark";

export const NavContext = createContext<{ theme: NavTheme }>({
  theme: "light",
});

export const navItems = [
  {
    name: "Product",
    content: ProductContent,
    childItems: FEATURES_LIST,
  },
  {
    name: "Solutions",
    content: SolutionsContent,
    childItems: SDKS,
  },
  {
    name: "Customers",
    href: "/customers",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Resources",
    content: ResourcesContent,
    childItems: RESOURCES,
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

export function Nav({ theme = "light" }: { theme?: NavTheme }) {
  const { domain = "dub.co" } = useParams() as { domain: string };

  const scrolled = useScroll(80);
  const scrolledHalf = useScroll(40);
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
        {/* Mobile background */}
        <div
          className={cn(
            "absolute inset-0 block transition-all lg:hidden",
            scrolledHalf &&
              (selectedLayout &&
              HIDE_BACKGROUND_SEGMENTS.includes(selectedLayout)
                ? "bg-white dark:bg-black"
                : "bg-white/75 backdrop-blur-md dark:bg-black/75"),
          )}
        />
        <MaxWidthWrapper className="relative">
          <div className="flex h-14 items-center justify-between">
            <Link
              className="grow basis-0"
              href={createHref("/", domain, {
                utm_source: "Custom Domain",
                utm_medium: "Navbar",
                utm_campaign: domain,
                utm_content: "Logo",
              })}
            >
              <NavLogo />
            </Link>
            <NavigationMenuPrimitive.Root
              delayDuration={0}
              className="relative hidden lg:block"
            >
              <NavigationMenuPrimitive.List className="relative flex flex-row gap-2 px-2 py-0.5">
                {/* Desktop background */}
                <div className="absolute inset-0 -z-[1]">
                  <div
                    className={cn(
                      "absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 drop-shadow-sm transition-all dark:border-white/10",
                      selectedLayout &&
                        HIDE_BACKGROUND_SEGMENTS.includes(selectedLayout)
                        ? "bg-white dark:bg-black"
                        : "bg-white/75 backdrop-blur-lg dark:bg-black/75",
                      scrolled && "h-14 w-screen rounded-none drop-shadow-none",
                    )}
                  />
                </div>
                {navItems.map(({ name, href, content: Content }) => {
                  const isActive =
                    href === `/${selectedLayout}` ||
                    (href === "/" && selectedLayout === null);
                  return (
                    <NavigationMenuPrimitive.Item key={name}>
                      <WithTrigger trigger={!!Content}>
                        {href !== undefined ? (
                          <Link
                            id={`nav-${href}`}
                            href={createHref(href, domain, {
                              utm_source: "Custom Domain",
                              utm_medium: "Navbar",
                              utm_campaign: domain,
                              utm_content: name,
                            })}
                            className={navItemStyles({ isActive })}
                          >
                            {name}
                          </Link>
                        ) : (
                          <button className={navItemStyles({ isActive })}>
                            {name}
                          </button>
                        )}
                      </WithTrigger>

                      {Content && (
                        <NavigationMenuPrimitive.Content className="data-[motion=from-start]:animate-enter-from-left data-[motion=from-end]:animate-enter-from-right data-[motion=to-start]:animate-exit-to-left data-[motion=to-end]:animate-exit-to-right absolute left-0 top-0">
                          <Content domain={domain} />
                        </NavigationMenuPrimitive.Content>
                      )}
                    </NavigationMenuPrimitive.Item>
                  );
                })}
              </NavigationMenuPrimitive.List>

              <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2">
                <NavigationMenuPrimitive.Viewport
                  className={cn(
                    "relative flex origin-[top_center] justify-start overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-md dark:border-white/[0.15] dark:bg-black",
                    "data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content",
                    "h-[var(--radix-navigation-menu-viewport-height)] w-[var(--radix-navigation-menu-viewport-width)] transition-[width,height]",
                  )}
                />
              </div>
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
                    href="https://d.to/login"
                    className="animate-fade-in rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black dark:text-white dark:hover:text-white/70"
                  >
                    Log in
                  </Link>
                  <Link
                    href="https://d.to/try"
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
