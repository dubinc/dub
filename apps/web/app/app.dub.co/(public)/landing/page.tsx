"use client";

import { FAQSection } from "@/ui/landing/faq-section/faq-section.tsx";
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
    <main className="relative mx-auto min-h-screen w-full px-3 py-6 md:py-[42px]">
      {isClient && (
        <>
          <QRTabs isMobile={isMobile} />
          <FAQSection isMobile={isMobile} />
        </>
      )}
    </main>
  );
}
