"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/zod/schemas/program-onboarding";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { CommissionType, EventType } from "@dub/prisma/client";
import { Button } from "@dub/ui";
import { Pencil } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { LINK_TYPES } from "../form";

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [programOnboarding, __, { mutateWorkspace }] = useWorkspaceStore<ProgramData>("programOnboarding");
  const { getValues } = useFormContext<ProgramData>();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: ({ data }) => {
      if (data?.id) {
        router.push(`/${workspaceSlug}/programs/${data.id}?onboarded-program`);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onClick = async () => {
    if (!workspaceId) return;

    const data = getValues();

    await executeAsync({
      ...data,
      workspaceId,
      step: "create-program",
    });
  };

  const rewardful = programOnboarding?.rewardful?.campaign;

  const reward = rewardful
    ? {
        type: rewardful.reward_type === "amount" ? ("flat" as const) : ("percentage" as const),
        amount:
          rewardful.reward_type === "amount"
            ? rewardful.commission_amount_cents ?? 0
            : rewardful.commission_percent ?? 0,
        maxDuration: rewardful.max_commission_period_months,
        event: "sale" as EventType,
      }
    : {
        type: (programOnboarding?.type ?? "flat") as CommissionType,
        amount: programOnboarding?.amount ?? 0,
        maxDuration: programOnboarding?.maxDuration ?? 0,
        event: "sale" as EventType,
      };

  const SECTIONS = [
    {
      title: "Reward",
      content: reward ? (
        <ProgramRewardDescription reward={reward} />
      ) : null,
      href: `/${workspaceSlug}/programs/new/rewards`,
    },
    {
      title: "Referral link structure",
      content: LINK_TYPES.find(
        (linkType) => linkType.value === programOnboarding?.linkType,
      )?.preview,
      href: `/${workspaceSlug}/programs/new`,
    },
    {
      title: "Destination URL",
      content: programOnboarding?.url,
      href: `/${workspaceSlug}/programs/new`,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ title, content, href }) => (
        <div
          key={title}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-800">
              {title}
            </div>
            <Link href={href}>
              <Button
                text={<Pencil className="size-4" />}
                variant="outline"
                className="h-8 w-8 shrink-0 p-0"
              />
            </Link>
          </div>
          <div className="mt-1.5 text-sm font-normal text-neutral-700">
            {content}
          </div>
        </div>
      ))}

      <Button
        text="Create program"
        className="mt-6 w-full"
        loading={isPending}
        type="button"
        onClick={onClick}
      />
    </div>
  );
}
