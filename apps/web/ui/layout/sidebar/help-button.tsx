"use client";

import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
// import posthog from "posthog-js";
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
            // if (!isOpen) {
            //   posthog.capture("help_portal_opened");
            // }
            setIsOpen((o) => !o);
          }}
          className={cn(
            "font-lg relative size-4 shrink-0 overflow-hidden rounded-full active:bg-neutral-50",
            "outline-none ring-offset-2 ring-offset-neutral-100 focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <AnimatePresence>
            <motion.div
              key={isOpen ? "open" : "closed"}
              className="absolute inset-0 flex items-center justify-center font-medium text-neutral-500 hover:text-neutral-700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isOpen ? (
                <XIcon className="size-4" strokeWidth={2} />
              ) : (
                <Icon
                  className="h-5 w-5 text-neutral-200"
                  icon="iconoir:question-mark-circle"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </button>
      </Popover>
    </HelpContext.Provider>
  );
}
