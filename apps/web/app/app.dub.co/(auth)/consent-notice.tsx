"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function ConsentNotice() {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="px-6 pb-4 text-center text-xs text-neutral-500"
    >
      By creating an account, you consent that you agree to our <br />
      <Link href="/eula" className="underline hover:text-neutral-800">
        Terms&nbsp;&&nbsp;Conditions
      </Link>{" "}
      and the{" "}
      <Link href="/privacy-policy" className="underline hover:text-neutral-800">
        Privacy Policy
      </Link>
      .
    </motion.span>
  );
}
