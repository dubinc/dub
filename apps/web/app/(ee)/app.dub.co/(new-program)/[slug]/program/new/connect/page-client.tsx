"use client";

import { useState } from "react";
import { Guide } from "./guide";
import { GuidesList } from "./guide-list";
import { IntegrationGuide } from "./types";

export function PageClient() {
  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide | null>(
    null,
  );

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-600">
        Ensure your program is connected to your website, so you can track your
        clicks, leads, and sales on your program.
      </p>

      <div>
        {selectedGuide ? (
          <Guide
            guide={selectedGuide}
            clearSelectedGuide={() => setSelectedGuide(null)}
          />
        ) : (
          <GuidesList onGuideSelect={setSelectedGuide} />
        )}
      </div>
    </div>
  );
}
