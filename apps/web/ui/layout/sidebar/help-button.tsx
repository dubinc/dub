"use client";

import { X } from "@/ui/shared/icons";
import { CircleQuestion, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import posthog from "posthog-js";
import { useState } from "react";
import { HelpArticle, HelpContext } from "../help";
import { HelpSection } from "../help/help-section";

export function HelpButton({
  popularHelpArticles,
  allHelpArticles,
}: {
  popularHelpArticles: HelpArticle[];
  allHelpArticles: HelpArticle[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HelpContext.Provider value={{ popularHelpArticles, allHelpArticles }}>
      <Popover
        content={<HelpSection />}
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        align="start"
      >
        <button
          type="button"
          onClick={() => {
            if (!isOpen) {
              posthog.capture("help_portal_opened");
            }
            setIsOpen((o) => !o);
          }}
          className={cn(
            "relative",
            "text-content-default flex size-11 shrink-0 items-center justify-center rounded-lg",
            "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10 transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <AnimatePresence>
            <motion.div
              key={isOpen ? "open" : "closed"}
              className="absolute inset-0 flex items-center justify-center font-medium"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isOpen ? (
                <X className="size-5" strokeWidth={2} />
              ) : (
                <CircleQuestion className="size-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>
      </Popover>
    </HelpContext.Provider>
  );
}
