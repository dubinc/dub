"use client";

import { useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function Modal({ children }) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      router.back();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <AnimatePresence>
      <div className="absolute">
        <motion.div
          ref={modalRef}
          key="desktop-modal"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="fixed inset-0 z-40 hidden min-h-screen items-center justify-center sm:flex"
          onMouseDown={(e) => {
            if (modalRef.current === e.target) {
              router.back();
            }
          }}
        >
          {children}
        </motion.div>
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur"
        />
      </div>
    </AnimatePresence>
  );
}
