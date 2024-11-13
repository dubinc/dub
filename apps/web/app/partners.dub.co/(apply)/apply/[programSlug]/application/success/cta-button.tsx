"use client";

import { Button } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function CTAButton() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <Button
      type="button"
      text={
        session?.user
          ? "Continue to dashboard"
          : "Create your Dub Partner account"
      }
      className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
      onClick={() => router.push("/register")}
    />
  );
}
