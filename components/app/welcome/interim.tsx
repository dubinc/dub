import { Dispatch, SetStateAction, useState } from "react";
import { motion } from "framer-motion";

export default function Interim({
  setState,
  staggerChildVariants,
}: {
  setState: Dispatch<SetStateAction<string>>;
  staggerChildVariants: any;
}) {
  return (
    <motion.div
      className="z-10 my-auto mx-5 flex flex-col items-center space-y-10 text-center sm:mx-auto"
      variants={{
        hidden: { opacity: 0, scale: 0.95 },
        show: {
          opacity: 1,
          scale: 1,
          transition: {
            staggerChildren: 0.3,
          },
        },
      }}
      initial="hidden"
      animate="show"
      exit="hidden"
      transition={{ duration: 0.5, type: "spring" }}
    >
      <motion.h1
        className="font-display text-4xl font-bold text-gray-800 transition-colors sm:text-5xl"
        variants={staggerChildVariants}
      >
        Welcome to Dub
      </motion.h1>
      <motion.p
        className="max-w-md text-gray-600 transition-colors sm:text-lg"
        variants={staggerChildVariants}
      >
        Dub provides you with a suite of powerful features that gives you
        marketing superpowers.
      </motion.p>
      <motion.button
        variants={staggerChildVariants}
        className="rounded-full bg-gray-800 px-10 py-2 font-medium text-white transition-colors hover:bg-black"
        onClick={() => setState("interim")}
      >
        Get Started
      </motion.button>
    </motion.div>
  );
}
