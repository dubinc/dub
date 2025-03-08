"use client";

import { useMediaQuery } from "@dub/ui";
import { useEffect, useState } from "react";
import { QRTabs } from "./components/qr-tabs/qr-tabs.tsx";

export default function LandingPage() {
  const [isClient, setIsClient] = useState<boolean>(false); // Fix Hydration Mismatch according to https://nextjs.org/docs/messages/react-hydration-error
  const { isMobile } = useMediaQuery();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="bg-primary-lighter relative mx-auto h-screen w-full px-3 py-6 md:py-[42px]">
      {isClient && <QRTabs isMobile={isMobile} />}
    </main>
  );
}
