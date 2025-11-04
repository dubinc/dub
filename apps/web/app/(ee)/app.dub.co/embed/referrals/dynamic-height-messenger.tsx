"use client";

import { useEffect } from "react";

export function DynamicHeightMessenger() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const update = () => {
      const height = document.body.scrollHeight;
      parent.postMessage(
        {
          originator: "Dub",
          event: "PAGE_HEIGHT",
          data: { height },
        },
        "*",
      );
    };
    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return false;
}
