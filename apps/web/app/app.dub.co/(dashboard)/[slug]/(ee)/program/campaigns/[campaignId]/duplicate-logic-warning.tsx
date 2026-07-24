import useWorkspace from "@/lib/swr/use-workspace";
import { CampaignList } from "@/lib/types";
import { workflowConditionSchema } from "@/lib/zod/schemas/workflows";
import { ChevronUp, Copy, LoadingSpinner } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import useSWR from "swr";
import { CampaignTypeIcon } from "../campaign-type-icon";
import { useCampaignFormContext } from "./campaign-form-context";

export function DuplicateLogicWarning() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { control } = useCampaignFormContext();

  const triggerCondition = useWatch({ control, name: "triggerCondition" });

  const parsedTriggerCondition = triggerCondition
    ? workflowConditionSchema.safeParse(triggerCondition)
    : undefined;

  const { data: campaigns, isLoading } = useSWR<CampaignList[]>(
    workspaceId &&
      parsedTriggerCondition?.success &&
      `/api/campaigns?${new URLSearchParams({
        workspaceId,
        type: "transactional",
        triggerCondition: JSON.stringify(parsedTriggerCondition.data),
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const duplicates =
    campaigns?.filter(
      (campaign) =>
        campaign.id !== campaignId &&
        !["draft", "canceled"].includes(campaign.status),
    ) ?? [];
  const hasDuplicates = duplicates.length > 0;

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!hasDuplicates && isOpen) setIsOpen(false);
  }, [hasDuplicates, isOpen]);

  return (
    <div
      inert={!hasDuplicates}
      className={cn(
        "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-150 ease-out",
        hasDuplicates &&
          cn(
            "grid-rows-[1fr] opacity-100",
            (isLoading || !parsedTriggerCondition?.success) &&
              "pointer-events-none opacity-50",
          ),
      )}
    >
      <div className="overflow-hidden">
        <div className="pt-2">
          <div className="bg-bg-muted border-border-muted rounded-lg border bg-clip-border">
            <button
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2"
            >
              {isLoading ? (
                <LoadingSpinner className="size-3 shrink-0" />
              ) : (
                <Copy className="text-content-emphasis size-3 shrink-0" />
              )}
              <span className="text-content-emphasis min-w-0 truncate text-xs font-semibold">
                Duplicate campaigns detected
              </span>
              <ChevronUp
                className={cn(
                  "text-content-subtle size-2 shrink-0 rotate-180 transition-transform",
                  isOpen && "rotate-0",
                )}
              />
            </button>
            <div
              className={cn(
                "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-150 ease-out",
                isOpen && "grid-rows-[1fr] opacity-100",
              )}
            >
              <div className="overflow-hidden">
                <div className="p-1">
                  {duplicates.map((duplicate) => (
                    <Link
                      key={duplicate.id}
                      href={`/${workspaceSlug}/program/campaigns/${duplicate.id}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-black/[0.03] active:bg-black/5"
                    >
                      <CampaignTypeIcon
                        type={duplicate.type}
                        className="size-5"
                        iconClassName="size-3"
                      />
                      <span className="text-content-emphasis text-xs font-medium">
                        {duplicate.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
