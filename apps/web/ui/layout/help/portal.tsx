"use client";

import { Popover } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { createContext, useEffect, useRef, useState } from "react";
import { HelpArticle } from ".";
import { ContactForm } from "./contact-form";
import { MainScreen } from "./main-screen";

export const HelpContext = createContext<{
  popularHelpArticles: HelpArticle[];
  allHelpArticles: HelpArticle[];
}>({
  popularHelpArticles: [],
  allHelpArticles: [],
});

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
          onClick={() => setIsOpen((o) => !o)}
          className="font-lg relative h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-white shadow-md active:bg-gray-50"
        >
          <AnimatePresence>
            <motion.div
              key={isOpen ? "open" : "closed"}
              className="absolute inset-0 flex items-center justify-center font-medium text-gray-700 hover:text-gray-700"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isOpen ? <XIcon className="h-4 w-4" strokeWidth={2} /> : "?"}
            </motion.div>
          </AnimatePresence>
        </button>
      </Popover>
    </HelpContext.Provider>
  );
}

function HelpSection() {
  const [screen, setScreen] = useState<"main" | "contact">("main");

  const ref = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.offsetHeight);
    }
  });

  return (
    <motion.div
      className="w-full overflow-hidden sm:w-[32rem]"
      animate={{ height: contentHeight }}
      transition={{ ease: "easeInOut" }}
    >
      <div ref={ref}>
        {screen === "main" && <MainScreen setScreen={setScreen} />}
        {screen === "contact" && <ContactForm setScreen={setScreen} />}
      </div>
    </motion.div>
  );
}
