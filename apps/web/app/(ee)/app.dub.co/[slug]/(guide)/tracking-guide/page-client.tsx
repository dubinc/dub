"use client";

import { Guide } from "@/ui/guides/guide";
import { GuideList } from "@/ui/guides/guide-list";
import { guides, IntegrationGuide } from "@/ui/guides/integrations";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
        Ensure Dub is connected to your app, so you can track your clicks,
        leads, and sales on your program. A developer might be required to
        complete.
      </p>

      <div>
        {selectedGuide ? (
          <Guide selectedGuide={selectedGuide} markdown={markdown} />
        ) : (
          <GuideList showConnectLaterButton={false} />
        )}
      </div>
    </div>
  );
}
