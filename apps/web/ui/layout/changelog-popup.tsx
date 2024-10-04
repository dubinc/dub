"use client";

import { BlurImage, Popup, PopupContext } from "@dub/ui";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";

const CHANGELOG_URL = "https://dub.link/builder";
const CHANGELOG_IMAGE_URL = "https://assets.dub.co/blog/new-link-builder.jpg";
const CHANGELOG_TITLE = "Introducing the new Dub Link Builder";
const CHANGELOG_DESCRIPTION =
  "Today, we're launching our new Link Builder to help you manage your links better.";
const CHANGELOG_ID = "hideChangelogPopup10032024";

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
      className="group fixed bottom-4 z-40 mx-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md sm:left-4 sm:mx-auto sm:max-w-sm"
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
            className="aspect-[1200/630] object-cover"
            width={1200}
            height={630}
          />
        </div>
        <div className="grid max-w-sm gap-1.5 p-4 text-center">
          <p className="text-center font-semibold text-gray-800 underline-offset-4 group-hover:underline">
            {CHANGELOG_TITLE}
          </p>
          <p className="text-pretty text-sm text-gray-500">
            {CHANGELOG_DESCRIPTION}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
