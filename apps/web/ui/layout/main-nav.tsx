"use client";

import { useKeyboardShortcut, useMediaQuery, useScroll } from "@dub/ui";
import { cn } from "@dub/utils";
import { useParams, usePathname } from "next/navigation";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { SidebarNav } from "./sidebar/sidebar-nav";

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
  toolContent,
}: PropsWithChildren<{ toolContent?: ReactNode }>) {
  const { slug } = useParams() as { slug?: string };
  const pathname = usePathname();
  const scrolled = useScroll(80);

  const { isMobile } = useMediaQuery();
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when side nav is open
  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  // Close side nav when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // TODO: Remove this once nav toggle button is added in page header
  useKeyboardShortcut("n", () => setIsOpen((o) => !o));

  return (
    <div className="min-h-screen sm:grid sm:grid-cols-[240px_minmax(0,1fr)]">
      {/* Side nav backdrop */}
      <div
        className={cn(
          "scrollbar-hide fixed left-0 top-0 z-50 h-screen w-full overflow-y-auto transition-[background-color,backdrop-filter] sm:sticky sm:z-auto sm:bg-transparent",
          isOpen
            ? "bg-black/20 backdrop-blur-sm"
            : "bg-transparent max-sm:pointer-events-none",
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        {/* Side nav */}
        <nav
          className={cn(
            "relative h-full w-[240px] max-w-full bg-neutral-100 transition-transform sm:translate-x-0",
            !isOpen && "-translate-x-full",
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "pointer-events-none absolute -left-2/3 bottom-0 aspect-square w-[140%] translate-y-1/4 rounded-full opacity-15 blur-[75px]",
                "bg-[conic-gradient(from_32deg_at_center,#855AFC_0deg,#3A8BFD_72deg,#00FFF9_144deg,#5CFF80_198deg,#EAB308_261deg,#f00_360deg)]",
              )}
            />
          </div>
          <SidebarNav toolContent={toolContent} />
        </nav>
      </div>
      <div className="bg-neutral-100">
        <div className="relative min-h-full bg-neutral-100 pt-px sm:rounded-tl-[16px] sm:bg-white">
          <SideNavContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
          </SideNavContext.Provider>
        </div>
      </div>
    </div>
  );
}
