"use client";

import { Popup, PopupContext, useResizeObserver } from "@dub/ui";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useContext, useRef } from "react";
import SurveyForm from "./survey-form";

export default function UserSurveyPopup() {
  const { data: session } = useSession();

  // @ts-ignore
  return session?.user.source !== null ? null : (
    <Popup hiddenCookieId="hideUserSurveyPopup">
      <UserSurveyPopupInner />
    </Popup>
  );
}

export function UserSurveyPopupInner() {
  const { hidePopup } = useContext(PopupContext);

  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const resizeObserverEntry = useResizeObserver(contentWrapperRef);

  return (
    <motion.div
      animate={{
        height: resizeObserverEntry?.borderBoxSize[0].blockSize ?? "auto",
      }}
      transition={{ ease: "easeInOut", duration: 0.1 }}
      className="fixed bottom-4 z-50 mx-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md sm:left-4 sm:mx-auto sm:max-w-sm"
    >
      <div className="p-4" ref={contentWrapperRef}>
        <button
          className="absolute right-2.5 top-2.5 rounded-full p-1 transition-colors hover:bg-gray-100 active:scale-90"
          onClick={hidePopup}
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
        <SurveyForm
          onSubmit={(source) => {
            fetch("/api/user", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ source }),
            });
            hidePopup();
          }}
        />
      </div>
    </motion.div>
  );
}
