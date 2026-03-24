"use client";

import { Tooltip } from "@dub/ui";
import { MsgsFill, Xmark } from "@dub/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ChatInterface } from "./chat-interface";
import { ClearChatButton } from "./clear-chat-button";

export function SupportChatBubble() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = () => setIsOpen(false);
  const handleOpen = () => setIsOpen(true);
  const handleReset = () => {
    if (session?.user?.["id"]) {
      try {
        localStorage.removeItem(`dub-support-chat:${session.user["id"]}`);
      } catch {}
    }
    setResetKey((k) => k + 1);
  };

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "dub-support-chat", isOpen }, "*");
  }, [isOpen]);

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
            className="pointer-events-auto mb-4 flex h-[660px] max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl shadow-neutral-900/15 sm:w-[560px]"
          >
            <div className="flex shrink-0 items-center justify-between bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://assets.dub.co/misc/dub-avatar.svg"
                  alt="Dub Support"
                  className="size-7 rounded-full"
                  draggable={false}
                />
                <p className="text-sm font-semibold leading-none text-white">
                  Dub Support
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <ClearChatButton
                  onConfirm={handleReset}
                  triggerClassName="size-7 text-neutral-400 hover:bg-white/10 hover:text-white"
                  iconClassName="size-3.5"
                />
                <Tooltip content="Close">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close chat"
                  >
                    <Xmark className="size-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <ChatInterface
              key={resetKey}
              onReset={handleReset}
              className="h-full overflow-hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
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
      </button>
    </div>
  );
}
