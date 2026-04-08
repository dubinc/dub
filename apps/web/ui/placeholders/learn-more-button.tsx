"use client";

import { createHref } from "@dub/utils";
import { useParams } from "next/navigation";
import { ButtonLink } from "./button-link";

export function LearnMoreButton({
  utmParams,
}: {
  utmParams: Record<string, string>;
}) {
  const { domain } = useParams() as { domain: string };
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
