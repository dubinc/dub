"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useRouter } from "next/navigation";

export function CreateCampaignButton() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<Campaign>();

  const createDraftCampaign = async () => {
    await makeRequest(`/api/campaigns`, {
      method: "POST",
      body: {
        type: "transactional",
      },
      onSuccess: (data) => {
        router.push(`/${slug}/program/campaigns/${data.id}`);
      },
    });
  };

  useKeyboardShortcut("c", () => createDraftCampaign);

  return (
    <Button
      type="button"
      text="Create campaign"
      className="h-8 px-3 sm:h-9"
      loading={isSubmitting}
      shortcut="C"
      onClick={createDraftCampaign}
    />
  );
}
