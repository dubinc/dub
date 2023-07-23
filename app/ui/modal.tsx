"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { cn } from "#/lib/utils";

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
  const mobileModalRef = useRef<HTMLDivElement | null>(null);

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

  const controls = useAnimation();
  const transitionProps = { type: "spring", stiffness: 500, damping: 30 };
  useEffect(() => {
    controls.start({
      y: 0,
      transition: transitionProps,
    });
  }, []);

  async function handleDragEnd(_, info) {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = mobileModalRef.current?.getBoundingClientRect().height || 0;
    if (offset > height / 2 || velocity > 800) {
      await controls.start({ y: "100%", transition: transitionProps });
      closeModal({ dragged: true });
    } else {
      controls.start({ y: 0, transition: transitionProps });
    }
  }

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
            <motion.div
              ref={mobileModalRef}
              key="mobile-modal"
              className="rounded-t-4xl group fixed inset-x-0 bottom-0 z-40 max-h-[80vh] w-screen cursor-grab overflow-scroll bg-white active:cursor-grabbing md:hidden"
              initial={{ y: "100%" }}
              animate={controls}
              exit={{ y: "100%" }}
              transition={transitionProps}
              drag="y"
              dragDirectionLock
              onDragEnd={handleDragEnd}
              dragElastic={{ top: 0, bottom: 1 }}
              dragConstraints={{ top: 0, bottom: 0 }}
            >
              <div className="rounded-t-4xl sticky top-0 z-20 flex h-7 w-full items-center justify-center border-t border-gray-200">
                <div className="-mr-1 h-1 w-6 rounded-full bg-gray-300 transition-all group-active:rotate-12" />
                <div className="h-1 w-6 rounded-full bg-gray-300 transition-all group-active:-rotate-12" />
              </div>
              {children}
            </motion.div>
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
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-50 backdrop-blur-md"
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
