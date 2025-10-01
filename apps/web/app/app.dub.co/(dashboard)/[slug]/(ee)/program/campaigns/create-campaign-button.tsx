"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useRouter } from "next/navigation";

export function CreateCampaignButton() {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();

  // useKeyboardShortcut("c", () =>
  //   router.push(`/${workspaceSlug}/program/campaigns/new`),
  // );

  return (
    <Button
      type="button"
      text="Create campaign"
      shortcut="C"
      className="h-8 px-3 sm:h-9"
      onClick={() => router.push(`/${workspaceSlug}/program/campaigns/new`)}
    />
  );
}
