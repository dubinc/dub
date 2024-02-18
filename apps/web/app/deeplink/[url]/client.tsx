"use client";

import { urlToDeeplink } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeeplinkClient({ url }: { url: string }) {
  const router = useRouter();

  useEffect(() => {
    const os = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "ios"
      : /Android/i.test(navigator.userAgent)
        ? "android"
        : "unknown";

    if (os !== "unknown") {
      const deepLink = urlToDeeplink({
        url,
        os,
      });
      if (deepLink !== url) {
        window.open(deepLink, "_blank");
        setTimeout(() => {
          router.push(url);
        }, 25);
      }
    }

    router.push(url);
  }, [url]);

  return <div />;
}
