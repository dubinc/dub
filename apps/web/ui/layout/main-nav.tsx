"use client";

import {
  consumePendingDashboardScrollTop,
  DUB_DASHBOARD_MAIN_SCROLL_ID,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ComponentType,
  createContext,
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useUpgradeBannerVisible } from "./upgrade-banner";

type SideNavContext = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

export const SideNavContext = createContext<SideNavContext>({
  isOpen: false,
  setIsOpen: () => {},
});

export function MainNav({
  children,
  sidebar: Sidebar,
  toolContent,
  newsContent,
}: PropsWithChildren<{
  sidebar: ComponentType<{
    toolContent?: ReactNode;
    newsContent?: ReactNode;
  }>;
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isDesktop } = useMediaQuery();
  const [isOpen, setIsOpen] = useState(false);
  const isUpgradeBannerVisible = useUpgradeBannerVisible();

  // Prevent body scroll when side nav is open
  useEffect(() => {
    document.body.style.overflow = isOpen && !isDesktop ? "hidden" : "auto";
  }, [isOpen, isDesktop]);

  // Close side nav when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useLayoutEffect(() => {
    const top = consumePendingDashboardScrollTop();
    if (top === null) return;
    const el = document.getElementById(DUB_DASHBOARD_MAIN_SCROLL_ID);
    if (!el) return;
    const apply = () => {
      el.scrollTop = top;
    };
    apply();
    // Next/React may reset nested scroll after layout; re-apply on the next frame(s).
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }, [searchParams.toString()]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[min-content_minmax(0,1fr)]">
      {/* Side nav backdrop */}
      <div
        className={cn(
          "fixed left-0 z-50 w-screen transition-[background-color,backdrop-filter] lg:sticky lg:z-auto lg:w-full lg:bg-transparent",
          isOpen
            ? "bg-black/20 backdrop-blur-sm"
            : "bg-transparent max-lg:pointer-events-none",
          isUpgradeBannerVisible
            ? "top-12 h-[calc(100dvh-48px)]"
            : "top-0 h-dvh",
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        {/* Side nav */}
        <div
          className={cn(
            "relative h-full w-min max-w-full bg-neutral-200 transition-transform lg:translate-x-0",
            !isOpen && "-translate-x-full",
          )}
        >
          <Sidebar toolContent={toolContent} newsContent={newsContent} />
        </div>
      </div>
      <div
        className={cn(
          "bg-neutral-200 pb-[var(--page-bottom-margin)] pt-[var(--page-top-margin)] [--page-bottom-margin:0px] [--page-top-margin:0px] lg:pb-2 lg:pr-2 lg:[--page-bottom-margin:0.5rem] lg:[--page-top-margin:0.5rem]",
          isUpgradeBannerVisible ? "mt-12 h-[calc(100vh-48px)]" : "h-screen",
        )}
      >
        <div
          id={DUB_DASHBOARD_MAIN_SCROLL_ID}
          className="relative h-full overflow-y-auto bg-neutral-100 pt-px lg:rounded-xl lg:bg-white"
        >
          <SideNavContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
          </SideNavContext.Provider>
        </div>
      </div>
    </div>
  );
}
