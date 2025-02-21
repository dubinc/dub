"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import {
  BasicInfo,
  ConfigureReward,
} from "@/lib/zod/schemas/program-onboarding";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { Button } from "@dub/ui";
import { Pencil } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LINK_TYPES } from "../new/form";

type ProgramOnboarding = Pick<BasicInfo, "url" | "linkType"> &
  Pick<ConfigureReward, "type" | "amount" | "maxDuration">;

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const [program] = useWorkspaceStore<ProgramOnboarding>("programOnboarding");

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/programs/onboarding/overview`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    if (!workspaceId) return;

    await executeAsync({
      workspaceId,
      step: "create-program",
    });
  };

  const SECTIONS = [
    {
      title: "Reward",
      content: program ? (
        <ProgramRewardDescription
          reward={{
            type: program.type,
            amount: program.amount,
            maxDuration: program.maxDuration,
            event: "sale",
          }}
        />
      ) : null,
      href: `/${workspaceSlug}/programs/onboarding/rewards`,
    },
    {
      title: "Referral link structure",
      content: LINK_TYPES.find(
        (linkType) => linkType.value === program?.linkType,
      )?.preview,
      href: `/${workspaceSlug}/programs/onboarding/new`,
    },
    {
      title: "Destination URL",
      content: program?.url,
      href: `/${workspaceSlug}/programs/onboarding/new`,
    },
  ] as const;

  console.log(program);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
      />
    </form>
  );
}
