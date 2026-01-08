"use client";

import { X } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";

export function CloseInviteButton({
  goToOnboarding,
}: {
  goToOnboarding?: boolean;
}) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      icon={<X className="text-content-subtle size-5" />}
      className="size-8 p-0 active:scale-95"
      onClick={() => router.push(goToOnboarding ? "/onboarding" : "/")}
    />
  );
}
