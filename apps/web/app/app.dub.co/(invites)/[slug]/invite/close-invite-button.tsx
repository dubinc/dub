"use client";

import { X } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";

export function CloseInviteButton({
  goToOnboarding,
  variant = "x",
}: {
  goToOnboarding?: boolean;
  variant?: "x" | "full";
}) {
  const router = useRouter();

  return (
    <Button
      variant={variant === "x" ? "outline" : "primary"}
      icon={
        variant === "x" ? (
          <X className="text-content-subtle size-5" />
        ) : undefined
      }
      className={
        variant === "x" ? "size-8 p-0 active:scale-95" : "h-9 w-fit rounded-lg"
      }
      text={variant === "x" ? undefined : "Go back"}
      onClick={() => router.push(goToOnboarding ? "/onboarding" : "/")}
    />
  );
}
