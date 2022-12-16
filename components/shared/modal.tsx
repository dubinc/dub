import { useRouter } from "next/router";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  bgColor?: string;
  trigger: React.ReactNode;
  closeWithX?: boolean;
}

export default function Modal({
  children,
  bgColor = "bg-white",
  closeWithX,
  trigger,
}: PropsWithChildren<ModalProps>) {
  const router = useRouter();
  const { key } = router.query;
  const mobileModalRef = useRef(null);
  const desktopModalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const closeModal = useCallback(
    (closeWithX?: boolean) => {
      if (closeWithX) {
        return;
      } else if (key) {
        router.push("/");
      } else {
        setShowModal(false);
      }
    },
    [key, router, setShowModal],
  );

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !closeWithX) {
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
    showModal &&
      controls.start({
        y: 0,
        transition: transitionProps,
      });
  }, [showModal]);

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

  useEffect(() => {
    setIsMobile(window.innerWidth <= 639);
    window.addEventListener("resize", () => {
      setIsMobile(window.innerWidth <= 639);
    });
    return () => window.removeEventListener("resize", () => {});
  }, []);

  useEffect(() => {
    isMobile && controls.start({ y: 0, transition: transitionProps });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  return (
    <Dialog.Root open={showModal} onOpenChange={setShowModal}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <AnimatePresence>
        {showModal && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay
              forceMount
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur transition-all"
            />
            <Dialog.Content
              className="overflow-hidden rounded-t-xl"
              asChild
              forceMount
            >
              <div className="absolute">
                {isMobile ? (
                  <motion.div
                    ref={mobileModalRef}
                    key="mobile-modal"
                    className="group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing sm:hidden"
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
                      className={`h-7 ${bgColor} rounded-t-4xl -mb-1 flex w-full items-center justify-center border-t border-gray-200`}
                    >
                      <div className="-mr-1 h-1 w-6 rounded-full bg-gray-300 transition-all group-active:rotate-12" />
                      <div className="h-1 w-6 rounded-full bg-gray-300 transition-all group-active:-rotate-12" />
                    </div>
                    {children}
                  </motion.div>
                ) : (
                  <motion.div
                    ref={desktopModalRef}
                    key="desktop-modal"
                    className="fixed inset-0 z-40 hidden min-h-screen items-center justify-center sm:flex"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    onMouseDown={(e) => {
                      if (desktopModalRef.current === e.target) {
                        closeModal(closeWithX);
                      }
                    }}
                  >
                    {children}
                  </motion.div>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
