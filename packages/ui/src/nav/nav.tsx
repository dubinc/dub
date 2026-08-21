"use client";

import { APP_DOMAIN, cn, createHref, fetcher } from "@dub/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  PropsWithChildren,
  ReactNode,
  SVGProps,
  createContext,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { buttonVariants } from "../button";
import { FEATURES_LIST, RESOURCES, SOLUTIONS } from "../content";
import { useScroll } from "../hooks";
import { MaxWidthWrapper } from "../max-width-wrapper";
import { NavWordmark } from "../nav-wordmark";
import { ProductContent } from "./content/product-content";
import { usePreloadProgramMarketplaceLogos } from "./content/program-marketplace";
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
    segments: [
      "/links",
      "/analytics",
      "/partners",
      "/integrations",
      "/compare",
      "/features",
    ],
  },
  {
    name: "Solutions",
    content: SolutionsContent,
    childItems: SOLUTIONS,
    segments: [
      // comment to help with line diff
      "/solutions",
      "/enterprise",
      "/startups",
      "/sdks",
    ],
  },
  {
    name: "Resources",
    content: ResourcesContent,
    childItems: RESOURCES,
    segments: [
      "/help",
      "/docs",
      "/about",
      "/careers",
      "/brand",
      "/blog",
      "/changelog",
      "/contact",
      "/marketplace",
    ],
  },
  {
    name: "Customers",
    href: "/customers",
    segments: ["/customers"],
  },
  {
    name: "Pricing",
    href: "/pricing",
    segments: ["/pricing"],
  },
  {
    name: "Enterprise",
    href: "/enterprise",
    segments: ["/enterprise"],
    mobileOnly: true,
  },
  {
    name: "Startups",
    href: "/startups",
    segments: ["/startups"],
    mobileOnly: true,
  },
];

const navItemClassName = cn(
  "relative group/item flex items-center rounded-md px-3 h-8 text-sm rounded-lg font-medium text-neutral-700 hover:text-neutral-900 transition-[color]",
  "dark:text-white/90 dark:hover:text-white",
  // Idle active state — hidden whenever the floating pill is showing
  "data-[active=true]:bg-neutral-900/5 dark:data-[active=true]:bg-white/10",
  "group-data-[pill=true]/nav:data-[active=true]:bg-transparent",
);

function getHoverStyle(list: HTMLElement, item: HTMLElement) {
  const listRect = list.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return {
    left: itemRect.left - listRect.left,
    width: itemRect.width,
    opacity: 1,
  };
}

const pillSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  opacity: { duration: 0 },
};

export function Nav({
  theme = "light",
  staticDomain,
  maxWidthWrapperClassName,
  logo,
}: {
  theme?: NavTheme;
  staticDomain?: string;
  maxWidthWrapperClassName?: string;
  logo?: ReactNode;
}) {
  let { domain = "dub.co" } = useParams() as { domain: string };
  if (staticDomain) {
    domain = staticDomain;
  }

  const navListRef = useRef<HTMLUListElement>(null);
  const [hoverStyle, setHoverStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const scrolled = useScroll(40);
  const pathname = usePathname();
  const { data: session, isLoading } = useSWR(
    domain.endsWith("dub.co") && "/api/auth/session",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  // warm the marketplace logos so the Resources dropdown opens without a stutter
  usePreloadProgramMarketplaceLogos();

  const showHover = (item: HTMLElement) => {
    const list = navListRef.current;
    if (!list) return;
    setHoverStyle(getHoverStyle(list, item));
  };

  const hideHover = () => {
    setHoverStyle((style) => ({ ...style, opacity: 0 }));
  };

  return (
    <NavContext.Provider value={{ theme }}>
      <div
        className={cn(
          `sticky inset-x-0 top-0 z-30 w-full transition-all`,
          theme === "dark" && "dark",
        )}
      >
        {/* Scrolled background */}
        <div
          className={cn(
            "absolute inset-0 block border-b border-transparent transition-all",
            scrolled &&
              "border-neutral-100 bg-white/75 backdrop-blur-lg dark:border-white/10 dark:bg-black/75",
          )}
        />
        <MaxWidthWrapper className={cn("relative", maxWidthWrapperClassName)}>
          <div className="flex h-14 items-center justify-between">
            <div className="grow basis-0">
              {logo ?? (
                <Link
                  className="block w-fit py-2 pr-2"
                  href={createHref("/home", domain, {
                    utm_source: "Custom Domain",
                    utm_medium: "Navbar",
                    utm_campaign: domain,
                    utm_content: "Logo",
                  })}
                >
                  <NavWordmark />
                </Link>
              )}
            </div>

            <NavigationMenuPrimitive.Root
              delayDuration={0}
              className="hidden lg:block"
              onValueChange={(value) => {
                // Closing a dropdown while moving to another nav item shouldn't clear the pill
                if (!value && !navListRef.current?.matches(":hover")) {
                  hideHover();
                }
              }}
            >
              <NavigationMenuPrimitive.List
                ref={navListRef}
                data-pill={hoverStyle.opacity > 0 ? "true" : undefined}
                className="group/nav relative flex"
                onMouseLeave={() => {
                  const list = navListRef.current;
                  const openTrigger =
                    list?.querySelector<HTMLElement>("[data-state=open]");
                  // Keep the pill on the open trigger so it doesn't flicker into the dropdown
                  if (list && openTrigger) {
                    setHoverStyle(getHoverStyle(list, openTrigger));
                  } else {
                    hideHover();
                  }
                }}
              >
                <motion.div
                  className="pointer-events-none absolute top-0 h-8 rounded-lg bg-neutral-900/5 dark:bg-white/10"
                  animate={hoverStyle}
                  transition={pillSpring}
                />
                {navItems
                  .filter(({ mobileOnly }) => !mobileOnly)
                  .map(({ name, href, segments, content: Content }) => {
                    const isActive = (segments ?? []).some((segment) =>
                      pathname?.startsWith(segment),
                    );
                    return (
                      <NavigationMenuPrimitive.Item key={name} value={name}>
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
                              className={navItemClassName}
                              data-active={isActive}
                              onMouseEnter={(e) => showHover(e.currentTarget)}
                            >
                              {name}
                            </Link>
                          ) : (
                            <button
                              className={navItemClassName}
                              data-active={isActive}
                              onMouseEnter={(e) => showHover(e.currentTarget)}
                            >
                              {name}
                              <AnimatedChevron className="ml-1.5 size-2.5 text-neutral-700" />
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

              {/* Positioned against MaxWidthWrapper so the dropdown centers on the page */}
              <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2">
                <NavigationMenuPrimitive.Viewport
                  className={cn(
                    "relative flex origin-top justify-start overflow-hidden rounded-[20px] border border-neutral-200 bg-white shadow-md dark:border-white/[0.15] dark:bg-black",
                    "data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content",
                    // +2px: Radix measures the content's border-box, but this element's
                    // 1px borders eat into it (border-box sizing), clipping fixed-width
                    // content by 2px on the right/bottom
                    "h-[calc(var(--radix-navigation-menu-viewport-height)_+_2px)] w-[calc(var(--radix-navigation-menu-viewport-width)_+_2px)] transition-[width,height]",
                  )}
                />
              </div>
            </NavigationMenuPrimitive.Root>

            <div className="hidden grow basis-0 justify-end gap-2 lg:flex">
              {session && Object.keys(session).length > 0 ? (
                <Link
                  href={APP_DOMAIN}
                  className={cn(
                    buttonVariants({ variant: "primary" }),
                    "flex h-8 items-center rounded-lg border px-4 text-sm",
                    "dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-50 dark:hover:ring-white/10",
                  )}
                >
                  Dashboard
                </Link>
              ) : !isLoading ? (
                <>
                  <Link
                    href="https://app.dub.co/login"
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "flex h-8 items-center rounded-lg border px-4 text-sm",
                      "dark:border-white/10 dark:bg-black dark:text-white dark:hover:bg-neutral-900",
                    )}
                  >
                    Log in
                  </Link>
                  <Link
                    href="https://app.dub.co/register"
                    className={cn(
                      buttonVariants({ variant: "primary" }),
                      "flex h-8 items-center rounded-lg border px-4 text-sm",
                      "dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-50 dark:hover:ring-white/10",
                    )}
                  >
                    Sign up
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

function AnimatedChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="9"
      height="9"
      fill="none"
      viewBox="0 0 9 9"
      {...props}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M7.278 3.389 4.5 6.167 1.722 3.389"
        className="transition-transform duration-150 [transform-box:view-box] [transform-origin:center] [vector-effect:non-scaling-stroke] group-data-[state=open]/item:-scale-y-100"
      />
    </svg>
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
