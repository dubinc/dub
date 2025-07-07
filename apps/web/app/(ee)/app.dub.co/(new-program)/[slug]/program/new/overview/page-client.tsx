"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { EventType, RewardStructure } from "@dub/prisma/client";
import { Button } from "@dub/ui";
import { Pencil } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

export function PageClient() {
  const {
    getValues,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useFormContext<ProgramData>();

  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const data = getValues();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onClick = async () => {
    if (!workspaceId) return;

    await executeAsync({
      ...data,
      workspaceId,
      step: "create-program",
    });
  };

  const isValid = useMemo(() => {
    const {
      name,
      url,
      domain,
      logo,
      programType,
      rewardful,
      type,
      amount,
      tolt,
    } = data;

    if (!name || !url || !domain || !logo) {
      return false;
    }

    if (programType === "new" && (!amount || !type)) {
      return false;
    }

    if (programType === "import" && !rewardful && !tolt) {
      return false;
    }

    return true;
  }, [data]);

  const reward = data.rewardful
    ? {
        type:
          data.rewardful.reward_type === "amount"
            ? ("flat" as const)
            : ("percentage" as const),
        amount:
          data.rewardful.reward_type === "amount"
            ? data.rewardful.commission_amount_cents ?? 0
            : data.rewardful.commission_percent ?? 0,
        maxDuration: data.rewardful.max_commission_period_months,
        event: "sale" as EventType,
      }
    : {
        type: (data.type ?? "flat") as RewardStructure,
        amount: data.amount ?? 0,
        maxDuration: data.maxDuration ?? 0,
        event: data.defaultRewardType,
      };

  const SECTIONS = [
    {
      title: "Reward",
      content: reward ? <ProgramRewardDescription reward={reward} /> : null,
      href: `/${workspaceSlug}/program/new/rewards`,
    },
    {
      title: "Referral link type",
      content: getLinkStructureOptions({
        domain: data.domain,
        url: data.url,
      }).find(({ id }) => id === data.linkStructure)?.example,
      href: `/${workspaceSlug}/program/new`,
    },
    {
      title: "Destination URL",
      content: data.url,
      href: `/${workspaceSlug}/program/new`,
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
        loading={isPending || isSubmitting || isSubmitSuccessful}
        type="button"
        onClick={onClick}
        disabled={!isValid}
        disabledTooltip={
          !isValid
            ? "Please fill all the required fields to create a program."
            : undefined
        }
      />
    </div>
  );
}
