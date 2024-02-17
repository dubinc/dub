"use client";

import { urlToDeeplink } from "@/lib/middleware/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeeplinkClient({ url }: { url: string }) {
  const router = useRouter();

  useEffect(() => {
    const deepLink = urlToDeeplink(url);

    if (
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
      deepLink !== url
    ) {
      window.open(deepLink, "_blank");
      setTimeout(() => {
        router.push(url);
      }, 25);
    } else {
      router.push(url);
    }

    const killPopup = () => window.removeEventListener("pagehide", killPopup);
    window.addEventListener("pagehide", killPopup);

    // Cleanup on component unmount
    return () => window.removeEventListener("pagehide", killPopup);
  }, [url]);

  return <div />;
}
