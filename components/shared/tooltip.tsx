/***********************************/

/*  Tooltip Contents  */
import Link from "next/link";
import { ReactNode, useRef, useState } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import BlurImage from "@/components/shared/blur-image";
import Slider from "@/components/shared/slider";
import { PRO_TIERS } from "@/lib/stripe/constants";
import { nFormatter } from "@/lib/utils";

export default function Tooltip({
  children,
  content,
  fullWidth,
}: {
  children: ReactNode;
  content: ReactNode | string;
  fullWidth?: boolean;
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

  return (
    <>
      <button
        type="button"
        className={`${fullWidth ? "w-full" : "inline-flex"} sm:hidden`}
        onClick={() => setOpenTooltip(true)}
      >
        {children}
      </button>
      <AnimatePresence>
        {openTooltip && (
          <>
            <motion.div
              ref={mobileTooltipRef}
              key="mobile-tooltip"
              className="group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing sm:hidden"
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
                className={`rounded-t-4xl -mb-1 flex h-7 w-full items-center justify-center border-t border-gray-200 bg-white`}
              >
                <div className="-mr-1 h-1 w-6 rounded-full bg-gray-300 transition-all group-active:rotate-12" />
                <div className="h-1 w-6 rounded-full bg-gray-300 transition-all group-active:-rotate-12" />
              </div>
              <div className="flex min-h-[150px] w-full items-center justify-center overflow-hidden bg-white align-middle shadow-xl">
                {typeof content === "string" ? (
                  <span className="block max-w-xs text-center text-sm text-gray-700">
                    {content}
                  </span>
                ) : (
                  content
                )}
              </div>
            </motion.div>
            <motion.div
              key="mobile-tooltip-backdrop"
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
          <TooltipPrimitive.Trigger className="hidden sm:inline-flex" asChild>
            {children}
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Content
            sideOffset={4}
            side="top"
            className="z-30 hidden animate-slide-up-fade items-center overflow-hidden rounded-md border border-gray-200 bg-white drop-shadow-lg sm:block"
          >
            <TooltipPrimitive.Arrow className="fill-current text-white" />
            {typeof content === "string" ? (
              <div className="p-5">
                <span className="block max-w-xs text-center text-sm text-gray-700">
                  {content}
                </span>
              </div>
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

export function TooltipContent({
  title,
  cta,
  ctaLink,
}: {
  title: string;
  cta?: string;
  ctaLink?: string;
}) {
  return (
    <div className="flex max-w-xs flex-col items-center space-y-3 p-5 text-center">
      <p className="text-sm text-gray-700">{title}</p>
      {cta && ctaLink && (
        <Link
          href={ctaLink}
          className="mt-4 rounded-full border border-black bg-black py-1.5 px-3 text-sm text-white transition-all hover:bg-white hover:text-black"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

export function OGImageProxy() {
  return (
    <div className="flex max-w-md flex-col items-center space-y-5 p-5 text-center">
      <BlurImage
        alt="Demo GIF for OG Image Proxy"
        src="https://res.cloudinary.com/dubdotsh/image/upload/v1664425639/og-image-proxy-demo.gif"
        width={1200}
        height={1084}
        className="w-full overflow-hidden rounded-md shadow-md"
      />
      <p className="text-sm text-gray-700">
        Add a custom OG image in front of your target URL. Bots like
        Twitter/Facebook will be served this image, while users will be
        redirected to your target URL.
      </p>
    </div>
  );
}

export function ProTiers({ usageLimit }: { usageLimit?: number }) {
  const [tier, setTier] = useState(
    usageLimit > 1000 ? PRO_TIERS.map((t) => t.quota).indexOf(usageLimit) : 0,
  );

  return (
    <div className="w-full rounded-md">
      <div className="flex w-full max-w-md items-center justify-between p-5">
        <h3 className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-2xl text-transparent">
          {PRO_TIERS[tier].name}
        </h3>
        <div className="flex items-center">
          <p className="text-2xl font-semibold text-gray-700">
            ${PRO_TIERS[tier].price.monthly.amount}
          </p>
          <p className="text-sm text-gray-700">/mo</p>
        </div>
      </div>
      <div className="flex w-full flex-col items-center space-y-1 border-t border-gray-200 bg-gray-50 p-5 text-center">
        <Slider
          value={tier}
          setValue={setTier}
          maxValue={PRO_TIERS.length - 1}
        />
        <p className="text-sm text-gray-700">
          Up to {nFormatter(PRO_TIERS[tier].quota)} link clicks/mo
        </p>
      </div>
    </div>
  );
}
