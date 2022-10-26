import { useRouter } from "next/router";
import { ReactNode, useEffect, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import useViewportSize from "@/lib/hooks/use-viewport-size";

export default function Popover({
  children,
  content,
  align = "center",
  openPopover,
  setOpenPopover,
}: {
  children: ReactNode;
  content: ReactNode | string;
  align?: "center" | "start" | "end";
  openPopover;
  setOpenPopover;
}) {
  const router = useRouter();

  const mobileTooltipRef = useRef(null);
  const controls = useAnimation();
  const transitionProps = { type: "spring", stiffness: 500, damping: 30 };

  async function handleDragEnd(_, info) {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = mobileTooltipRef.current.getBoundingClientRect().height;
    if (offset > height / 2 || velocity > 800) {
      await controls.start({ y: "100%", transition: transitionProps });
      setOpenPopover(false);
    } else {
      controls.start({ y: 0, transition: transitionProps });
    }
  }
  const { width } = useViewportSize();

  // workaround to make popover close when route changes on desktop
  useEffect(() => {
    setOpenPopover(false);
  }, [router.query.slug]);

  return (
    <>
      <div className="md:hidden">{children}</div>
      <AnimatePresence>
        {openPopover && (
          <>
            <motion.div
              ref={mobileTooltipRef}
              key="mobile-tooltip"
              className="group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing md:hidden"
              initial={{ y: "100%" }}
              animate={{
                y: openPopover ? 0 : "100%",
                transition: transitionProps,
              }}
              exit={{ y: "100%" }}
              transition={transitionProps}
              drag="y"
              dragDirectionLock
              onDragEnd={handleDragEnd}
              dragElastic={{ top: 0, bottom: 1 }}
              dragConstraints={{ top: 0, bottom: 0 }}
            >
              <div
                className={`rounded-t-4xl -mb-1 flex h-7 w-full items-center justify-center border-t border-gray-200 bg-white`}
              >
                <div className="-mr-1 h-1 w-6 rounded-full bg-gray-300 transition-all group-active:rotate-12" />
                <div className="h-1 w-6 rounded-full bg-gray-300 transition-all group-active:-rotate-12" />
              </div>
              <div className="flex min-h-[150px] w-full items-center justify-center overflow-hidden bg-white align-middle shadow-xl">
                {content}
              </div>
            </motion.div>
            <motion.div
              key="mobile-tooltip-backdrop"
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenPopover(false)}
            />
          </>
        )}
      </AnimatePresence>
      <PopoverPrimitive.Root
        // workaround to make popover work on mobile (without this it'll automatically close on click without changing route)
        open={width > 640 && openPopover}
        onOpenChange={width > 640 && setOpenPopover}
      >
        <PopoverPrimitive.Trigger className="hidden md:inline-flex" asChild>
          {children}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          sideOffset={4}
          align={align}
          className="z-20 hidden animate-slide-up-fade items-center rounded-md border border-gray-200 bg-white drop-shadow-lg md:block"
        >
          {content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </>
  );
}
