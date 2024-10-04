"use client";

import { Popover } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
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
        align="end"
      >
        <button
          type="button"
          onClick={() => {
            if (!isOpen) {
              posthog.capture("help_portal_opened");
            }
            setIsOpen((o) => !o);
          }}
          className="animate-fade-in font-lg relative h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-white shadow-md active:bg-gray-50"
        >
          <AnimatePresence>
            <motion.div
              key={isOpen ? "open" : "closed"}
              className="absolute inset-0 flex items-center justify-center font-medium text-gray-700 hover:text-gray-700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ ease: "easeInOut", duration: 0.1 }}
            >
              {isOpen ? <XIcon className="h-4 w-4" strokeWidth={2} /> : "?"}
            </motion.div>
          </AnimatePresence>
        </button>
      </Popover>
    </HelpContext.Provider>
  );
}
