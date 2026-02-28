"use client";

import { SupportChatContext } from "./types";
import { MsgsFill, Xmark } from "@dub/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChatInterface } from "./chat-interface";

export function SupportChatBubble({
  context = "app",
  // When true: panel starts open, no bubble button rendered.
  // The parent page controls open/close via postMessage.
  externalTrigger = false,
}: {
  context?: SupportChatContext;
  externalTrigger?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(externalTrigger);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    if (externalTrigger && window.parent !== window) {
      window.parent.postMessage({ type: "dub-support-chat", isOpen: false }, "*");
    }
  };

  useEffect(() => {
    if (!externalTrigger) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "dub-support-open") setIsOpen(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [externalTrigger]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col items-end p-3 sm:p-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto mb-4 flex h-[660px] max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/15 sm:w-[560px]"
          >
            <div className="flex shrink-0 items-center justify-between bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://assets.dub.co/misc/dub-avatar.svg"
                  alt="Dub Support"
                  className="size-7 rounded-full"
                  draggable={false}
                />
                <div>
                  <p className="text-sm font-semibold leading-none text-white">
                    Dub Support
                  </p>
                  <p className="mt-0.5 text-[11px] leading-none text-neutral-400">
                    Escalates to human when needed
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <Xmark className="size-3.5" />
              </button>
            </div>

            <ChatInterface context={context} className="flex-1 overflow-hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {!externalTrigger && <button
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
        className="pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-neutral-900 shadow-lg shadow-neutral-900/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-neutral-900/30 active:scale-95"
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <Xmark className="size-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <MsgsFill className="size-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>}
    </div>
  );
}
