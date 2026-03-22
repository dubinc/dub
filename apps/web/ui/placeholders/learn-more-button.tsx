"use client";

import { createHref } from "@dub/utils";
import { useEffect, useState } from "react";
import { ButtonLink } from "./button-link";

export function LearnMoreButton({
  utmParams,
}: {
  utmParams: Record<string, string>;
}) {
  const [domain, setDomain] = useState("");
  useEffect(() => {
    setDomain(window.location.hostname);
  }, []);
  return (
    <ButtonLink
      variant="secondary"
      href={createHref("/links", domain, {
        ...utmParams,
        utm_campaign: domain,
        utm_content: "Learn more",
      })}
    >
      Learn more
    </ButtonLink>
  );
}
