"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Guide } from "./guide";
import { GuideList } from "./guide-list";
import { guides } from "./integration-guides";
import { IntegrationGuide } from "./types";

interface PageClientProps {
  markdown: string | null;
}

export function PageClient({ markdown }: PageClientProps) {
  const searchParams = useSearchParams();
  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide | null>(
    null,
  );

  useEffect(() => {
    const guide = searchParams.get("guide");

    if (!guide) {
      setSelectedGuide(null);
      return;
    }

    const integrationGuide = guides.find((g) => g.key === guide.toLowerCase());

    if (integrationGuide) {
      setSelectedGuide(integrationGuide);
    }
  }, [searchParams]);

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-600">
        Ensure your program is connected to your website, so you can track your
        clicks, leads, and sales on your program.
      </p>

      <div>
        {selectedGuide ? (
          <Guide selectedGuide={selectedGuide} markdown={markdown} />
        ) : (
          <GuideList />
        )}
      </div>
    </div>
  );
}
