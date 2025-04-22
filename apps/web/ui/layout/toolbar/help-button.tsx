"use client";

import posthog from "posthog-js";
import { HelpArticle, HelpContext } from "../help";
import { useHelpSheet } from "../help/help-sheet";

export function HelpButton({
  popularHelpArticles,
  allHelpArticles,
}: {
  popularHelpArticles: HelpArticle[];
  allHelpArticles: HelpArticle[];
}) {
  const { HelpSheet, setIsOpen, isOpen } = useHelpSheet();

  return (
    <HelpContext.Provider
      value={{
        popularHelpArticles,
        allHelpArticles,
      }}
    >
      {HelpSheet}
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
    </HelpContext.Provider>
  );
}
