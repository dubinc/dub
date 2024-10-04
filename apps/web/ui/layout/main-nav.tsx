"use client";

import {
  MaxWidthWrapper,
  NavLogo,
  useKeyboardShortcut,
  useMediaQuery,
  useScroll,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  Suspense,
  useEffect,
  useState,
} from "react";
import { Divider } from "../shared/icons";
import NavTabs from "./nav-tabs";
import { SidebarNav } from "./sidebar/sidebar-nav";
import UpgradeBanner from "./upgrade-banner";
import UserDropdown from "./user-dropdown";
import WorkspaceSwitcher from "./workspace-switcher";

export type SideNavContext = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

const SideNavContext = createContext<SideNavContext>({
  isOpen: false,
  setIsOpen: () => {},
});

export function MainNav({
  sidenav,
  children,
  toolContent,
}: PropsWithChildren<{ sidenav: boolean; toolContent?: ReactNode }>) {
  const { slug } = useParams() as { slug?: string };
  const scrolled = useScroll(80);

  const { isMobile } = useMediaQuery();
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when side nav is open
  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  // TODO: Remove this once nav toggle button is added in page header
  useKeyboardShortcut("n", () => setIsOpen((o) => !o));

  return sidenav ? (
    <div className="grid min-h-screen sm:grid-cols-[240px_1fr]">
      {/* Side nav backdrop */}
      <div
        className={cn(
          "scrollbar-hide fixed left-0 top-0 z-50 h-screen w-full overflow-y-auto transition-[background-color,backdrop-filter] sm:sticky sm:z-auto sm:bg-transparent",
          isOpen
            ? "bg-black/20 backdrop-blur-sm"
            : "bg-transparent max-sm:pointer-events-none",
        )}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        {/* Side nav */}
        <nav
          className={cn(
            "h-full w-[240px] max-w-full bg-neutral-100 transition-transform sm:translate-x-0",
            !isOpen && "-translate-x-full",
          )}
        >
          <SidebarNav toolContent={toolContent} />
        </nav>
      </div>
      <div className="bg-neutral-100">
        <div className="relative min-h-full bg-white pt-px sm:rounded-tl-[16px]">
          <SideNavContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
          </SideNavContext.Provider>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div className="sticky -top-16 z-20 border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/${slug || ""}`}
                className={cn(
                  "hidden transition-all sm:block",
                  scrolled && "translate-y-[3.4rem]",
                )}
              >
                <NavLogo
                  variant="symbol"
                  isInApp
                  {...(scrolled && { className: "h-6 w-6" })}
                />
              </Link>
              <Divider className="hidden h-8 w-8 text-gray-200 sm:ml-3 sm:block" />
              <WorkspaceSwitcher />
            </div>
            <div className="flex items-center space-x-6">
              <UpgradeBanner />
              <a
                href="https://dub.co/help"
                className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 sm:block"
                target="_blank"
              >
                Help
              </a>
              <UserDropdown />
            </div>
          </div>
          <Suspense fallback={<div className="h-12 w-full" />}>
            <NavTabs />
          </Suspense>
        </MaxWidthWrapper>
      </div>
      {children}
    </>
  );
}
