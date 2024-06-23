"use client";

import { BlurImage, Popup, PopupContext } from "@dub/ui";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";

const CHANGELOG_URL = "https://dub.co/changelog/root-domain-links";
const CHANGELOG_IMAGE_URL =
  "https://assets.dub.co/changelog/root-domain-links-min.png";
const CHANGELOG_ID = "hideChangelogPopup06222024";

export default function ChangelogPopup() {
  return (
    <Popup hiddenCookieId={CHANGELOG_ID}>
      <ChangelogPopupInner />
    </Popup>
  );
}

export function ChangelogPopupInner() {
  const { hidePopup } = useContext(PopupContext);

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 50 }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
      exit={{ opacity: 0, y: "100%" }}
      className="fixed bottom-4 z-40 mx-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md sm:left-4 sm:mx-auto sm:max-w-sm"
    >
      <button
        className="absolute right-2.5 top-2.5 z-10 rounded-full p-1 transition-colors hover:bg-gray-100 active:scale-90"
        onClick={hidePopup}
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
      <Link
        href={CHANGELOG_URL}
        target="_blank"
        className="flex max-w-sm flex-col items-center justify-center"
        onClick={() => hidePopup()}
      >
        <div className="border-b border-gray-200">
          <BlurImage
            src={CHANGELOG_IMAGE_URL}
            alt="Root Domain Links"
            className="aspect-video object-cover"
            width={1600}
            height={900}
          />
        </div>
        <p className="max-w-xs p-4 text-center text-sm text-gray-600">
          Your root domain links now have the same advanced features as regular
          short links.{" "}
          <span className="font-medium underline underline-offset-2 transition-all hover:text-black">
            Read the announcement
          </span>{" "}
          to learn more.
        </p>
      </Link>
    </motion.div>
  );
}
