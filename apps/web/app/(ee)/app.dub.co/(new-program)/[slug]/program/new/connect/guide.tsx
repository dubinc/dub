"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { IntegrationGuide } from "./types";

export function Guide({
  guide,
  clearSelectedGuide,
}: {
  guide: IntegrationGuide;
  clearSelectedGuide: () => void;
}) {
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

  const Icon = guide.icon;

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
            onClick={clearSelectedGuide}
          />
        </div>

        <h2 className="py-2 text-xl font-semibold leading-7 text-neutral-900">
          Instructions for {guide.title}
        </h2>

        <div className="rounded-2xl bg-white p-0 py-6 shadow-none">
          {/* Step 1 */}
          <div className="mb-4">
            <div className="mb-1 text-base font-bold">
              Step 1: Install the Dub {guide.title} App
            </div>
            <div className="mb-6 text-neutral-600">
              Ensure your program is connected to your website, so you can track
              your clicks, leads, and sales on your program.
            </div>
          </div>

          {/* Help Article Section */}
          <div className="mb-8 flex min-h-[260px] items-center justify-center rounded-2xl bg-neutral-100">
            <span className="text-center text-neutral-500">
              Rest of the help article content
            </span>
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
