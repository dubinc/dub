"use client";

import { Menu, X } from "lucide-react";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useState } from "react";

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useMediaQuery();

  // Prevent body scroll when side nav is open
  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="rounded-md p-1 hover:bg-neutral-100 md:hidden fixed left-4 top-[72px] z-20"
      >
        <Menu className="h-5 w-5 text-neutral-600" />
      </button>

      {/* Side nav backdrop */}
      <div
        className={cn(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-screen transition-[background-color,backdrop-filter] md:sticky md:top-0 md:z-0 md:h-[calc(100vh-3.5rem)] md:w-full md:bg-transparent",
          isOpen
            ? "bg-black/20 backdrop-blur-sm"
            : "bg-transparent max-md:pointer-events-none",
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
            "relative h-full w-[240px] max-w-full bg-white border-r border-neutral-200 transition-transform md:translate-x-0",
            !isOpen && "-translate-x-full",
          )}
        >
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between md:hidden">
              <h2 className="text-sm font-medium">Program Setup</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 hover:bg-neutral-100"
              >
                <X className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
            <nav className="space-y-1">
              <div className="flex items-center gap-3 rounded-md bg-neutral-50 px-3 py-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
                  1
                </div>
                <span className="text-sm font-medium">Getting started</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-neutral-500">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs">
                  2
                </div>
                <span className="text-sm">Configure reward</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-neutral-500">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs">
                  3
                </div>
                <span className="text-sm">Invite partners</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-neutral-500">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs">
                  4
                </div>
                <span className="text-sm">Connect Dub</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-neutral-500">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs">
                  5
                </div>
                <span className="text-sm">Overview</span>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="rounded-md p-1 hover:bg-neutral-100 md:hidden"
    >
      <Menu className="h-5 w-5 text-neutral-600" />
    </button>
  );
} 