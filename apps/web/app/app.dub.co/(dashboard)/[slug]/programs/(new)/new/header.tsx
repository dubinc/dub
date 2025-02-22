"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Wordmark } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const { getValues } = useFormContext();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
     // router.push(`/${workspaceSlug}`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const saveAndExit = async () => {
    if (!workspaceId) return;

    const data = getValues();

    console.log("saveAndExit", data);

    await executeAsync({
      ...data,
      workspaceId,
      step: "save-and-exit",
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center">
          <Wordmark className="h-7" />
        </Link>
        <h1 className="hidden text-base font-semibold text-neutral-700 md:block">
          Create partner program
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="group flex h-7 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm text-neutral-600 transition-all hover:bg-neutral-100"
        >
          Cancel
        </Link>

        <Button
          text="Save and exit"
          variant="secondary"
          className="h-7 w-auto"
          loading={isPending}
          onClick={saveAndExit}
        />
      </div>
    </header>
  );
}
