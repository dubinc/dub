"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Guide } from "./guide";
import { GuidesList } from "./guide-list";
import { IntegrationGuide, IntegrationType } from "./types";

export function PageClient() {
  const router = useRouter();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();
  const [integrationType, setIntegrationType] =
    useState<IntegrationType>("no-code");
  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide | null>(
    null,
  );

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/overview`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onClick = async () => {
    if (!workspaceId) return;

    setHasSubmitted(true);
    await executeAsync({
      workspaceId,
      step: "connect",
    });
  };

  return (
    <div>
      <p className="text-sm text-neutral-600">
        Ensure your program is connected to your website, so you can track your
        clicks, leads, and sales on your program.
      </p>

      <div className="mt-6 space-y-10">
        {selectedGuide ? (
          <Guide guide={selectedGuide} />
        ) : (
          <GuidesList
            integrationType={integrationType}
            onIntegrationTypeChange={setIntegrationType}
            onGuideSelect={setSelectedGuide}
          />
        )}

        <Button
          text="I'll do this later"
          variant="secondary"
          className="w-full"
          loading={isPending || hasSubmitted}
          type="button"
          onClick={onClick}
        />
      </div>
    </div>
  );
}
