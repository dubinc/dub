"use client";

import { APP_DOMAIN, cn, createHref, fetcher } from "@dub/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { LayoutGroup } from "framer-motion";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { PropsWithChildren, SVGProps, createContext, useId } from "react";
import useSWR from "swr";
import { buttonVariants } from "../button";
import { COMPANY, FEATURES_LIST, RESOURCES } from "../content";
import { useScroll } from "../hooks";
import { MaxWidthWrapper } from "../max-width-wrapper";
import { NavWordmark } from "../nav-wordmark";
import { CompanyContent } from "./content/company-content";
import { ProductContent } from "./content/product-content";
import { ResourcesContent } from "./content/resources-content";

export type NavTheme = "light" | "dark";

export const NavContext = createContext<{ theme: NavTheme }>({
  theme: "light",
});

export const navItems = [
  {
    name: "Product",
    content: ProductContent,
    childItems: FEATURES_LIST,
    segments: ["/home", "/analytics", "/features", "/compare"],
  },
  {
    name: "Resources",
    content: ResourcesContent,
    childItems: RESOURCES,
    segments: ["/solutions", "/docs", "/help", "/brand"],
  },
  {
    name: "Company",
    content: CompanyContent,
    childItems: COMPANY,
    segments: ["about", "/blog", "/changelog", "/customers"],
  },
  {
    name: "Enterprise",
    href: "/enterprise",
    segments: ["/enterprise"],
  },
  {
    name: "Pricing",
    href: "/pricing",
    segments: ["/pricing"],
  },
];

const navItemClassName = cn(
  "relative group/item flex items-center rounded-md px-4 py-2 text-sm rounded-lg font-medium text-neutral-700 hover:text-neutral-900 transition-colors",
  "dark:text-white/90 dark:hover:text-white",
  "hover:bg-neutral-900/5 dark:hover:bg-white/10",
  "data-[active=true]:bg-neutral-900/5 dark:data-[active=true]:bg-white/10",

  // Hide active state when another item is hovered
  "group-has-[:hover]:data-[active=true]:[&:not(:hover)]:bg-transparent",
);

export function Nav({
  theme = "light",
  staticDomain,
  maxWidthWrapperClassName,
}: {
  theme?: NavTheme;
  staticDomain?: string;
  maxWidthWrapperClassName?: string;
}) {
  let { domain = "dub.co" } = useParams() as { domain: string };
  if (staticDomain) {
    domain = staticDomain;
  }

  const layoutGroupId = useId();

  const scrolled = useScroll(40);
  const pathname = usePathname();
  const { data: session, isLoading } = useSWR(
    domain.endsWith("dub.co") && "/api/auth/session",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <NavContext.Provider value={{ theme }}>
      <LayoutGroup id={layoutGroupId}>
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
              </div>
              <NavigationMenuPrimitive.Root
                delayDuration={0}
                className="relative hidden lg:block"
              >
                <NavigationMenuPrimitive.List className="group relative z-0 flex">
                  {navItems.map(
                    ({ name, href, segments, content: Content }) => {
                      const isActive = segments.some((segment) =>
                        pathname?.startsWith(segment),
                      );
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
                                className={navItemClassName}
                                data-active={isActive}
                              >
                                {name}
                              </Link>
                            ) : (
                              <button
                                className={navItemClassName}
                                data-active={isActive}
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
                    },
                  )}
                </NavigationMenuPrimitive.List>

                <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2">
                  <NavigationMenuPrimitive.Viewport
                    className={cn(
                      "relative flex origin-[top_center] justify-start overflow-hidden rounded-[20px] border border-neutral-200 bg-white shadow-md dark:border-white/[0.15] dark:bg-black",
                      "data-[state=closed]:animate-scale-out-content data-[state=open]:animate-scale-in-content",
                      "h-[var(--radix-navigation-menu-viewport-height)] w-[var(--radix-navigation-menu-viewport-width)] transition-[width,height]",
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
      </LayoutGroup>
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
