"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useRouter } from "next/navigation";


// TODO:
// Replace this with Link

export function CreateCampaignButton() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const redirectToNewCampaign = () => {
    router.push(`/${slug}/program/campaigns/new`);
  };

  useKeyboardShortcut("c", () => redirectToNewCampaign());

  return (
    <>
      <Button
        type="button"
        onClick={redirectToNewCampaign}
        text={`Create${isMobile ? "" : " email"}`}
        shortcut="C"
        className="h-8 px-3 sm:h-9"
      />
    </>
  );
}
