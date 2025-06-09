"use client";

import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, XIcon } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { HelpArticle, HelpContext } from "../help";
import { HelpSection } from "../help/help-section";

export type HelpButtonVariant = "old" | "default";

export function HelpButton({
  variant = "default",
  popularHelpArticles,
  allHelpArticles,
}: {
  variant?: HelpButtonVariant;
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
            variant === "old"
              ? [
                  "font-lg size-4 shrink-0 overflow-hidden rounded-full text-neutral-500 hover:text-neutral-700 active:bg-neutral-50",
                  "outline-none ring-offset-2 ring-offset-neutral-100 focus-visible:ring-2 focus-visible:ring-black/50",
                ]
              : [
                  "text-content-default flex size-12 shrink-0 items-center justify-center rounded-lg",
                  "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 transition-colors duration-150",
                ],
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
                <XIcon
                  className={variant === "old" ? "size-4" : "size-5"}
                  strokeWidth={2}
                />
              ) : (
                <CircleHelp
                  className={variant === "old" ? "size-4" : "size-5"}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </button>
      </Popover>
    </HelpContext.Provider>
  );
}
