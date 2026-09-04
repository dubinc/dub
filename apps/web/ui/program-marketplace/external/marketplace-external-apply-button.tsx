"use client";

import { Button } from "@dub/ui";
import { fetcher, PARTNERS_DOMAIN } from "@dub/utils";
import useSWR from "swr";

export function MarketplaceExternalApplyButton({
  programSlug,
}: {
  programSlug: string;
}) {
  const { data: session } = useSWR("/api/auth/session", fetcher, {
    dedupingInterval: 60000,
  });

  return (
    <a
      href={
        session && Object.keys(session).length > 0
          ? `${PARTNERS_DOMAIN}/marketplace/${programSlug}`
          : `${PARTNERS_DOMAIN}/${programSlug}/apply`
      }
      target="_blank"
      className="inline-block"
    >
      <Button
        text="Apply"
        className="h-9 w-fit rounded-lg px-5 text-sm font-medium"
      />
    </a>
  );
}
