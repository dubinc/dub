"use client";

import { InlineSnippet } from "@dub/ui";
import { STAGGER_CHILD_VARIANTS } from "@dub/utils";
import Spline from "@splinetool/react-spline";
import va from "@vercel/analytics";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useDebounce } from "use-debounce";

export default function PlaceholderContent() {
  const { domain } = useParams() as { domain: string };
  const [loading, setLoading] = useState(true);
  const onLoad = () => {
    setLoading(false);
  };
  // workaround to avoid the blinking effect when Spline loads
  const [opacity] = useDebounce(loading ? 0 : 1, 200);

  const [showText] = useDebounce(loading ? false : true, 800);

  return (
    <motion.div
      className="z-10 mb-20"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <div
        className={`${
          loading ? "scale-[25%] blur-md" : "scale-100 blur-0"
        } mt-[7vh] h-[50vh] w-screen object-cover transition-all duration-1000`}
      >
        <Spline
          onLoad={onLoad}
          style={{ opacity: opacity }}
          scene="https://assets.dub.co/misc/scene.splinecode"
        />
      </div>
      <motion.div
        variants={{
          show: {
            transition: {
              staggerChildren: 0.3,
            },
          },
        }}
        initial="hidden"
        animate={showText ? "show" : "hidden"}
        className="mx-5 flex flex-col items-center space-y-10 text-center sm:mx-auto"
      >
        <motion.h1
          className="font-display text-4xl font-bold text-gray-800 transition-colors sm:text-5xl"
          variants={STAGGER_CHILD_VARIANTS}
        >
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME}
        </motion.h1>
        <motion.p
          className="max-w-xl text-gray-600 transition-colors sm:text-lg"
          variants={STAGGER_CHILD_VARIANTS}
        >
          <InlineSnippet>{domain}</InlineSnippet> is a custom domain on{" "}
          <a
            className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-semibold text-transparent decoration-rose-600 hover:underline"
            href="https://dub.co"
            onClick={() =>
              va.track("Referred from custom domain", {
                domain,
                medium: "text",
              })
            }
          >
            {process.env.NEXT_PUBLIC_APP_NAME}
          </a>{" "}
          - the link management platform for modern marketing teams.
        </motion.p>
        <motion.a
          variants={STAGGER_CHILD_VARIANTS}
          href="https://dub.co"
          onClick={() =>
            va.track("Referred from custom domain", {
              domain,
              medium: "button",
            })
          }
          className="rounded-full bg-gray-800 px-10 py-2 font-medium text-white transition-colors hover:bg-black"
        >
          Create Your Free Branded Link
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
