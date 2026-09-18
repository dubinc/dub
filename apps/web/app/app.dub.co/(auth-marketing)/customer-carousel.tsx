"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

const AUTO_ADVANCE_MS = 4000;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
// Logos are dark on assets.dub.co; this filter renders them white
const WHITE_LOGO = "brightness(0) invert(1)";

const CUSTOMERS: {
  name: string;
  slug: string;
  logo: string;
  image: string;
  headline: string;
  /** Tint color for the bottom gradient */
  color: string;
}[] = [
  {
    name: "Framer",
    slug: "framer",
    logo: "https://assets.dub.co/companies/framer.svg",
    image: "https://assets.dub.co/cms/framer-thumbnail.jpg",
    headline:
      "Learn how Framer manages $900K+ in monthly affiliate payouts with Dub",
    color: "#0088FF",
  },
  {
    name: "Wispr Flow",
    slug: "wisprflow",
    logo: "https://assets.dub.co/companies/wisprflow.svg",
    image: "https://assets.dub.co/cms/wisprflow-cover2.jpg",
    headline: "Learn how Wispr Flow reached millions more users with Dub",
    color: "#024F46",
  },
  {
    name: "Chatbase",
    slug: "chatbase",
    logo: "https://assets.dub.co/companies/chatbase.svg",
    image: "https://assets.dub.co/cms/chatbase-cover.jpg",
    headline:
      "Learn how Chatbase migrated from Rewardful and increased affiliate revenue by 318%",
    color: "#D85AC8",
  },
  {
    name: "Tella",
    slug: "tella",
    logo: "https://assets.dub.co/companies/tella.svg",
    image: "https://assets.dub.co/cms/tella-thumbnail.jpg",
    headline:
      "Learn how Tella increased affiliate revenue by 38% by switching from Rewardful to Dub",
    color: "#8278FA",
  },
];

export function CustomerCarousel() {
  const [index, setIndex] = useState(0);
  const customer = CUSTOMERS[index];

  const goTo = (next: number) => setIndex(next % CUSTOMERS.length);

  return (
    <div className="relative h-[452px] w-full max-w-[481px] overflow-hidden rounded-xl bg-neutral-900">
      {/* Photo */}
      <AnimatePresence initial={false}>
        <motion.img
          key={customer.slug}
          src={customer.image}
          alt={customer.name}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="absolute inset-x-0 top-0 h-[360px] w-full object-cover"
        />
      </AnimatePresence>

      {/* Fade photo into the dark base */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[102px] h-[171px] bg-gradient-to-b from-neutral-900/0 to-neutral-900" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[103px] bg-neutral-900" />

      {/* Customer tint */}
      <AnimatePresence initial={false}>
        <motion.div
          key={customer.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="pointer-events-none absolute -inset-x-16 -bottom-8 h-[300px] -rotate-6 blur-2xl"
          style={{
            background: `linear-gradient(to bottom, transparent 20%, ${customer.color})`,
          }}
        />
      </AnimatePresence>

      {/* Copy */}
      <div className="absolute bottom-[60px] left-6 right-6 flex max-w-[345px] flex-col gap-6">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={customer.slug} className="flex flex-col gap-3">
            <motion.img
              src={customer.logo}
              alt={customer.name}
              initial={{ opacity: 0, y: 12, filter: `${WHITE_LOGO} blur(4px)` }}
              animate={{ opacity: 1, y: 0, filter: `${WHITE_LOGO} blur(0px)` }}
              exit={{ opacity: 0, y: -8, filter: `${WHITE_LOGO} blur(4px)` }}
              transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.04 }}
              className="h-7 w-auto self-start"
            />
            <motion.p
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="text-pretty text-base font-medium leading-6 tracking-[-0.02em] text-white"
            >
              {customer.headline}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <Link
          href={`https://dub.co/customers/${customer.slug}`}
          target="_blank"
          className="text-content-emphasis flex h-7 w-fit items-center rounded-lg border border-neutral-200 bg-white px-2.5 text-sm font-medium hover:bg-neutral-100"
        >
          Read more
        </Link>
      </div>

      {/* Inner border, painted over the image */}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border border-white/10" />

      {/* Progress bars */}
      <div className="absolute inset-x-6 bottom-6 flex items-center gap-3">
        {CUSTOMERS.map((c, i) => {
          const isActive = i === index;
          return (
            <button
              key={c.slug}
              type="button"
              aria-label={`Show ${c.name}`}
              aria-current={isActive}
              onClick={() => goTo(i)}
              className="group relative h-1 min-w-0 flex-1 cursor-pointer"
            >
              <div className="h-full w-full rounded-full bg-white/20 transition-colors group-hover:bg-white/30" />
              {isActive && (
                <motion.div
                  key={index}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: AUTO_ADVANCE_MS / 1000,
                    ease: "linear",
                  }}
                  onAnimationComplete={() => goTo(index + 1)}
                  className="absolute inset-0 origin-left rounded-full bg-white"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
