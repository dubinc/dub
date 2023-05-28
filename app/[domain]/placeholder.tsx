"use client";

import Background from "@/components/shared/background";
import { useState } from "react";
import { motion } from "framer-motion";
import { useDebounce } from "use-debounce";
import { STAGGER_CHILD_VARIANTS } from "@/lib/constants";
import Spline from "@splinetool/react-spline";
import { InlineSnippet } from "@/components/app/domains/domain-configuration";
import { useParams } from "next/navigation";

export default function PlaceholderContent() {
  const { domain } = useParams() as { domain: string };
  const [loading, setLoading] = useState(true);
  const onLoad = () => {
    setLoading(false);
  };
  // workarouond to avoid the blinking effect when Spline loads
  const [opacity] = useDebounce(loading ? 0 : 1, 200);

  const [showText] = useDebounce(loading ? false : true, 800);

  return (
    <div className="flex h-screen flex-col items-center">
      <Background />
      <motion.div
        className="z-10"
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
            scene="https://prod.spline.design/cJkq6hsiUPNRHeMf/scene.splinecode"
          />
        </div>
        {showText && (
          <motion.div
            variants={{
              show: {
                transition: {
                  staggerChildren: 0.3,
                },
              },
            }}
            initial="hidden"
            animate="show"
            className="mx-5 flex flex-col items-center space-y-10 text-center sm:mx-auto"
          >
            <motion.h1
              className="font-display text-4xl font-bold text-gray-800 transition-colors sm:text-5xl"
              variants={STAGGER_CHILD_VARIANTS}
            >
              Welcome to Dub
            </motion.h1>
            <motion.p
              className="max-w-xl text-gray-600 transition-colors sm:text-lg"
              variants={STAGGER_CHILD_VARIANTS}
            >
              <InlineSnippet>{domain}</InlineSnippet> is a custom domain on{" "}
              <a
                className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-semibold text-transparent decoration-rose-600 hover:underline"
                href={`https://dub.sh?utm_source=${domain}&utm_medium=referral&utm_campaign=custom-domain`}
              >
                Dub
              </a>{" "}
              - a link management tool for modern marketing teams to create,
              share, and track short links.
            </motion.p>
            <motion.a
              variants={STAGGER_CHILD_VARIANTS}
              href={`https://dub.sh?utm_source=${domain}&utm_medium=referral&utm_campaign=custom-domain`}
              className="rounded-full bg-gray-800 px-10 py-2 font-medium text-white transition-colors hover:bg-black"
            >
              Create Your Free Branded Link
            </motion.a>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
