"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { Button, MenuItem, Popover, useKeyboardShortcut } from "@dub/ui";
import { Command } from "cmdk";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";
import { CampaignTypeIcon } from "./campaign-type-icon";

const campaignTypes = Object.values(CAMPAIGN_TYPE_BADGES).map(
  ({ label, value }) => ({
    label,
    value,
    shortcut: value === "marketing" ? "M" : "T",
  }),
);

export function CreateCampaignButton() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<Campaign>();
  const [isOpen, setIsOpen] = useState(false);

  const createDraftCampaign = async (type: "marketing" | "transactional") => {
    await makeRequest(`/api/campaigns`, {
      method: "POST",
      body: {
        type,
      },
      onSuccess: (campaign) => {
        router.push(`/${slug}/program/campaigns/${campaign.id}`);
        mutatePrefix("/api/campaigns");
      },
    });
  };

  useKeyboardShortcut("m", () => createDraftCampaign("marketing"), {
    enabled: isOpen && !isSubmitting,
  });

  useKeyboardShortcut("t", () => createDraftCampaign("transactional"), {
    enabled: isOpen && !isSubmitting,
  });

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[200px]">
            {campaignTypes.map(({ label, value, shortcut }) => (
              <MenuItem
                key={value}
                icon={<CampaignTypeIcon type={value} />}
                label={label}
                shortcut={shortcut}
                disabled={isSubmitting}
                onClick={() => {
                  setIsOpen(false);
                  createDraftCampaign(value);
                }}
              >
                {label}
              </MenuItem>
            ))}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        variant="primary"
        className="h-9 w-fit rounded-lg px-3"
        loading={isSubmitting}
        text={
          <div className="flex items-center gap-2">
            Create campaign{" "}
            <ChevronDown className="size-4 transition-transform duration-75 group-data-[state=open]:rotate-180" />
          </div>
        }
        onClick={() => setIsOpen(!isOpen)}
      />
    </Popover>
  );
}
