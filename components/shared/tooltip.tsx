import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

export default function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: ReactNode | string;
}) {
  const [openTooltip, setOpenTooltip] = useState(false);
  const mobileTooltipRef = useRef(null);

  const controls = useAnimation();
  const transitionProps = { type: "spring", stiffness: 500, damping: 30 };

  async function handleDragEnd(_, info) {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = mobileTooltipRef.current.getBoundingClientRect().height;
    if (offset > height / 2 || velocity > 800) {
      await controls.start({ y: "100%", transition: transitionProps });
      setOpenTooltip(false);
    } else {
      controls.start({ y: 0, transition: transitionProps });
    }
  }
  const randomIndex = Math.floor(Math.random() * 1000000).toString();
  return (
    <>
      <button className="block sm:hidden" onClick={() => setOpenTooltip(true)}>
        {children}
      </button>
      <AnimatePresence>
        {openTooltip && (
          <>
            <motion.div
              ref={mobileTooltipRef}
              key={`mobile-tooltip-${randomIndex}`}
              className="group fixed bottom-0 inset-x-0 z-40 w-screen sm:hidden cursor-grab active:cursor-grabbing"
              initial={{ y: "100%" }}
              animate={{
                y: openTooltip ? 0 : "100%",
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
                className={`h-7 bg-white w-full flex items-center justify-center rounded-t-4xl border-t border-gray-200 -mb-1`}
              >
                <div className="rounded-full h-1 w-6 -mr-1 bg-gray-300 group-active:rotate-12 transition-all" />
                <div className="rounded-full h-1 w-6 bg-gray-300 group-active:-rotate-12 transition-all" />
              </div>
              <div className="flex items-center justify-center w-full overflow-hidden align-middle bg-white shadow-xl min-h-[150px]">
                {typeof content === "string" ? (
                  <span className="block text-sm text-center text-gray-700 max-w-xs">
                    {content}
                  </span>
                ) : (
                  content
                )}
              </div>
            </motion.div>
            <motion.div
              key={`mobile-tooltip-backdrop-${randomIndex}`}
              className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenTooltip(false)}
            />
          </>
        )}
      </AnimatePresence>
      <TooltipPrimitive.Provider delayDuration={100}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger className="hidden sm:flex" asChild>
            {children}
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Content
            sideOffset={4}
            side="top"
            className="hidden sm:block animate-slide-up-fade items-center rounded-md px-4 py-2.5 z-20 bg-white border border-gray-200 drop-shadow-lg"
          >
            <TooltipPrimitive.Arrow className="fill-current text-white" />
            {typeof content === "string" ? (
              <span className="block text-sm text-center text-gray-700 max-w-xs">
                {content}
              </span>
            ) : (
              content
            )}
            <TooltipPrimitive.Arrow className="fill-current text-white" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </>
  );
}

/***********************************/
/*  Tooltip Contents  */

import Link from "next/link";
import BlurImage from "@/components/shared/blur-image";

export function TooltipContent({
  title,
  cta,
  ctaLink,
}: {
  title: string;
  cta: string;
  ctaLink: string;
}) {
  return (
    <div className="max-w-xs flex flex-col text-center items-center space-y-3 py-2">
      <p className="text-sm text-gray-700">{title}</p>
      <Link href={ctaLink}>
        <a className="py-1.5 px-3 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all mt-4">
          {cta}
        </a>
      </Link>
    </div>
  );
}

export function OGImageProxy() {
  return (
    <div className="max-w-md flex flex-col text-center items-center space-y-5 p-5">
      <BlurImage
        alt="Demo GIF for OG Image Proxy"
        src="https://res.cloudinary.com/dubdotsh/image/upload/v1664425639/og-image-proxy-demo.gif"
        width={1200}
        height={1084}
        className="w-full rounded-md overflow-hidden shadow-md"
      />
      <p className="text-sm text-gray-700">
        Add a custom OG image in front of your target URL. Bots like
        Twitter/Facebook will be served this image, while users will be
        redirected to your target URL.
      </p>
    </div>
  );
}
