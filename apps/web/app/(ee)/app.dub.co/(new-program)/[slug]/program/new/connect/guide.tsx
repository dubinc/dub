"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Markdown } from "@/ui/shared/markdown";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { IntegrationGuide } from "./types";

interface GuideProps {
  selectedGuide: IntegrationGuide;
  markdown: string | null;
}

export function Guide({ selectedGuide, markdown }: GuideProps) {
  const router = useRouter();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/overview`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onContinue = async () => {
    if (!workspaceId) {
      return;
    }

    setHasSubmitted(true);

    await executeAsync({
      workspaceId,
      step: "connect",
    });
  };

  const Icon = selectedGuide.icon;

  return (
    <>
      <hr className="mb-6 border-neutral-200" />
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Icon className="size-8" />
          <Button
            text="Select another method"
            variant="secondary"
            className="h-8 w-fit rounded-lg px-2"
            type="button"
            onClick={() => router.push(`/${workspaceSlug}/program/new/connect`)}
          />
        </div>

        <h2 className="py-2 text-xl font-semibold leading-7 text-neutral-900">
          Instructions for {selectedGuide.title}
        </h2>

        <div className="rounded-2xl bg-white p-0 py-6 shadow-none">
          {/* Step 1 */}
          <div className="mb-4">
            <div className="mb-1 text-base font-bold">
              Step 1: Install the Dub {selectedGuide.title} App
            </div>
            <div className="mb-6 text-neutral-600">
              Ensure your program is connected to your website, so you can track
              your clicks, leads, and sales on your program.
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-neutral-100">
            {markdown && <Markdown className="p-6">{markdown}</Markdown>}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              text="I've completed this"
              className="w-full"
              type="button"
              onClick={onContinue}
              loading={isPending || hasSubmitted}
            />

            <Button
              text="I'll do this later"
              variant="secondary"
              className="w-full"
              type="button"
              onClick={onContinue}
              loading={isPending || hasSubmitted}
            />
          </div>
        </div>
      </div>
    </>
  );
}
