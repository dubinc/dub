"use client";

import { Button } from "@dub/ui";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { useSession } from "next-auth/react";

export function MarketplaceExternalApplyButton({
  programSlug,
}: {
  programSlug: string;
}) {
  const { data: session } = useSession();
  return (
    <a
      href={
        session
          ? `${PARTNERS_DOMAIN}/marketplace/${programSlug}`
          : `${PARTNERS_DOMAIN}/${programSlug}/apply`
      }
      target="_blank"
      className="inline-block w-fit"
    >
      <Button
        text="Apply"
        className="h-10 w-fit rounded-lg px-6 text-sm font-medium"
      />
    </a>
  );
}
