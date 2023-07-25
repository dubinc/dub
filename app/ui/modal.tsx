"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { cn } from "#/lib/utils";
import { Drawer } from "vaul";
import useWindowSize from "#/lib/hooks/use-window-size";

export default function Modal({
  children,
  showModal,
  setShowModal,
  className,
  onClose,
  disableDefaultHide,
}: {
  children: React.ReactNode;
  showModal?: boolean;
  setShowModal?: Dispatch<SetStateAction<boolean>>;
  className?: string;
  onClose?: () => void;
  disableDefaultHide?: boolean;
}) {
  const router = useRouter();

  const closeModal = ({ dragged }: { dragged?: boolean } = {}) => {
    if (disableDefaultHide && !dragged) {
      return;
    }
    // fire onClose event if provided
    onClose && onClose();

    // if setShowModal is defined, use it to close modal
    if (setShowModal) {
      setShowModal(false);
      // else, this is intercepting route @modal
    } else {
      router.back();
    }
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }
    // only add listener if modal is open
    if (showModal) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModal, closeModal]);

  const { isMobile } = useWindowSize();

  if (isMobile)
    return (
      <Drawer.Root
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            closeModal({ dragged: true });
          }
        }}
        shouldScaleBackground
      >
        <Drawer.Overlay className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur" />
        <Drawer.Portal>
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-40 mt-24 rounded-t-[10px] border-t border-gray-200 bg-white">
            <div className="mx-auto my-3 h-1 w-12 rounded-full bg-gray-300" />
            {children}
          </Drawer.Content>
          <Drawer.Overlay />
        </Drawer.Portal>
      </Drawer.Root>
    );

  return (
    <AnimatePresence>
      {(setShowModal ? showModal : true) && (
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onActivate: () => {
              // prevent scroll outside of modal when modal is open
              document.body.style.overflow = "hidden";
            },
            onDeactivate: () => {
              // allow scroll outside of modal when modal is closed
              document.body.style.overflow = "auto";
            },
          }}
        >
          <div className="absolute">
            <motion.dialog
              key="desktop-modal"
              className={cn(
                "fixed inset-0 z-40 m-auto hidden max-h-fit w-full max-w-md animate-scale-in overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl md:block",
                className,
              )}
            >
              {children}
            </motion.dialog>
            <motion.div
              id="modal-backdrop"
              key="backdrop"
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeModal()}
            />
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
