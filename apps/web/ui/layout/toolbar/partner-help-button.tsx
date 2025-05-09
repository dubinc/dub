"use client";

import { useProgramSupportSheet } from "@/ui/partners/program-support-sheet";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { HelpContext } from "../help";

export function PartnerHelpButton() {
  const pathname = usePathname();
  const { ProgramSupportSheet, setIsOpen, isOpen } = useProgramSupportSheet();

  if (pathname === "/programs") {
    return null;
  }

  return (
    <HelpContext.Provider
      value={{
        popularHelpArticles: [],
        allHelpArticles: [],
      }}
    >
      {ProgramSupportSheet}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            posthog.capture("partner_help_portal_opened");
            setIsOpen(true);
          }}
          className="animate-fade-in font-lg relative h-12 w-12 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-md active:bg-neutral-50"
        >
          <div className="absolute inset-0 flex items-center justify-center font-medium text-neutral-700 hover:text-neutral-700">
            ?
          </div>
        </button>
      )}
    </HelpContext.Provider>
  );
}
