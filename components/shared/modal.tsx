import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";

export default function Modal({
  children,
  showModal,
  setShowModal,
  bgColor = "bg-white",
}: {
  children: React.ReactNode;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  bgColor?: string;
}) {
  const router = useRouter();
  const { key } = router.query;
  const mobileModalRef = useRef(null);
  const desktopModalRef = useRef(null);

  const closeModal = useCallback(() => {
    if (key) {
      router.push("/");
    } else {
      setShowModal(false);
    }
  }, [key, router, setShowModal]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowModal(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

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
    const height = mobileModalRef.current.getBoundingClientRect().height;
    if (offset > height / 2 || velocity > 800) {
      await controls.start({ y: "100%", transition: transitionProps });
      closeModal();
    } else {
      controls.start({ y: 0, transition: transitionProps });
    }
  }

  return (
    <AnimatePresence>
      {showModal && (
        <FocusTrap>
          <div className="absolute">
            <motion.div
              ref={mobileModalRef}
              key="mobile-modal"
              className="group fixed bottom-0 inset-x-0 z-40 w-screen sm:hidden cursor-grab active:cursor-grabbing"
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
              <div
                className={`h-7 ${bgColor} w-full flex items-center justify-center rounded-t-4xl border-t border-gray-200 -mb-1`}
              >
                <div className="rounded-full h-1 w-6 -mr-1 bg-gray-300 group-active:rotate-12 transition-all" />
                <div className="rounded-full h-1 w-6 bg-gray-300 group-active:-rotate-12 transition-all" />
              </div>
              {children}
            </motion.div>
            <motion.div
              ref={desktopModalRef}
              key="desktop-modal"
              className="fixed inset-0 z-40 min-h-screen hidden sm:flex items-center justify-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => {
                if (desktopModalRef.current === e.target) closeModal();
              }}
            >
              {children}
            </motion.div>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
