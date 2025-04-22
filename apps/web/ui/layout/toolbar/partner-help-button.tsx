"use client";

import { ProgramSupportSheet } from "@/ui/partners/program-support-sheet";
import { Popover } from "@dub/ui";
import posthog from "posthog-js";
import { useState } from "react";
import { HelpContext } from "../help";

export function PartnerHelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HelpContext.Provider
      value={{
        popularHelpArticles: [],
        allHelpArticles: [],
      }}
    >
      <Popover
        content={<ProgramSupportSheet isOpen={isOpen} setIsOpen={setIsOpen} />}
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        align="end"
      >
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              posthog.capture("help_portal_opened");
              setIsOpen(true);
            }}
            className="animate-fade-in font-lg relative h-12 w-12 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-md active:bg-neutral-50"
          >
            <div className="absolute inset-0 flex items-center justify-center font-medium text-neutral-700 hover:text-neutral-700">
              ?
            </div>
          </button>
        )}
      </Popover>
    </HelpContext.Provider>
  );
}
