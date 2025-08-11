"use client";

import { Button } from "@dub/ui";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function CTAButtons() {
  const { programSlug } = useParams();
  const { status } = useSession();

  const slugPrefix = programSlug ? `/${programSlug}` : "";

  return (
    <>
      <Link href={status === "authenticated" ? "/" : `${slugPrefix}/register`}>
        <Button
          type="button"
          text={
            status === "authenticated"
              ? "Continue to Dub Partners"
              : "Create your Dub Partners account"
          }
          className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
        />
      </Link>
      {status === "unauthenticated" && (
        <Link href={`${slugPrefix}/login`}>
          <Button
            type="button"
            variant="secondary"
            text="Log in to Dub Partners"
          />
        </Link>
      )}
    </>
  );
}
