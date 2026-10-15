"use client";

import { Button } from "@dub/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

export function CTAButtons({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { programSlug } = useParams();

  const slugPrefix = programSlug ? `/${programSlug}` : "";

  return (
    <>
      <Link href={isAuthenticated ? "/programs" : `${slugPrefix}/register`}>
        <Button
          type="button"
          text={
            isAuthenticated
              ? "Continue to Dub Partners"
              : "Create your Dub Partners account"
          }
          className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
        />
      </Link>
      {!isAuthenticated && (
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
