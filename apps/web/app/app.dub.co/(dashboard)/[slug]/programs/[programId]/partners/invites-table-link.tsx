"use client";

import { buttonVariants } from "@dub/ui";
import { EnvelopeArrowRight } from "@dub/ui/src/icons";
import { Tooltip } from "@dub/ui/src/tooltip";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function InvitesTableLink() {
  const { slug, programId } = useParams() as {
    slug: string;
    programId: string;
  };
  return (
    <Tooltip content="View sent invites">
      <Link
        href={`/${slug}/programs/${programId}/partners/invites`}
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "flex h-10 items-center rounded-lg border px-3 text-sm",
        )}
      >
        <EnvelopeArrowRight className="size-4" />
      </Link>
    </Tooltip>
  );
}
