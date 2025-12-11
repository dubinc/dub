"use client";

import { isClickOnInteractiveChild } from "@dub/utils";
import { useRouter } from "next/navigation";

export const useClickHandlers = (
  url: string | undefined,
  router: ReturnType<typeof useRouter>,
) =>
  url
    ? {
        onClick: (e: React.MouseEvent<Element, MouseEvent>) => {
          if (isClickOnInteractiveChild(e)) return;
          e.metaKey || e.ctrlKey
            ? window.open(url, "_blank")
            : router.push(url);
        },
        onAuxClick: (e: React.MouseEvent<Element, MouseEvent>) => {
          if (isClickOnInteractiveChild(e)) return;
          window.open(url, "_blank");
        },
        role: "link",
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent<Element>) =>
          e.target === e.currentTarget && e.key === "Enter" && router.push(url),
      }
    : {};
