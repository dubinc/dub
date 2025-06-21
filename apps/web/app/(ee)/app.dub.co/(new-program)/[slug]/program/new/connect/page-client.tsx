"use client";

import { ProgramData } from "@/lib/types";
import { getDomainWithoutWWW } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Guide } from "./guide";
import { GuideList } from "./guide-list";
import { guides, IntegrationGuide } from "./integration-guides";

interface PageClientProps {
  markdown: string | null;
}

export function PageClient({ markdown }: PageClientProps) {
  const searchParams = useSearchParams();
  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const [url] = watch(["url"]);

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
        Ensure Dub is connected to your app{" "}
        <strong>{url ? getDomainWithoutWWW(url) : ""}</strong>, so you can track
        your clicks, leads, and sales on your program. A developer might be
        required to complete.
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
