"use client";

import { generateLanderAction } from "@/lib/actions/partners/generate-lander";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { Button, LoadingSpinner, Sparkle3 } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";
import { GenerateLanderModal } from "./modals/generate-lander-modal";

export function LanderPreviewControls() {
  const { id: workspaceId } = useWorkspace();

  const { setValue, getValues } = useBrandingFormContext();
  const { landerData } = {
    ...useWatch(),
    ...getValues(),
  };

  const { isGeneratingLander, setIsGeneratingLander, isGenerateBannerHidden } =
    useBrandingContext();

  const [showGenerateLanderModal, setShowGenerateLanderModal] = useState(false);

  const { executeAsync } = useAction(generateLanderAction, {
    async onSuccess() {
      toast.success("Landing page updated.");
    },
    onError({ error }) {
      console.error(error);
    },
  });

  const showGenerateButton =
    isGenerateBannerHidden || landerData?.blocks.length !== 0;

  return (
    <>
      <div
        className={cn(
          "pointer-events-none w-0 translate-y-1 overflow-hidden opacity-0 transition-[opacity,transform]",
          showGenerateButton &&
            "pointer-events-auto w-auto translate-y-0 opacity-100",
        )}
        {...{ inert: showGenerateButton ? undefined : "" }}
      >
        <Button
          type="button"
          variant="success"
          text={
            <div className="flex items-center gap-1">
              Generate
              {isGeneratingLander ? (
                <LoadingSpinner className="size-3" />
              ) : (
                <Sparkle3 className="size-3" />
              )}
            </div>
          }
          disabled={isGeneratingLander}
          className="animate-fade-in h-7 w-fit px-2 hover:ring-0"
          onClick={() => setShowGenerateLanderModal(true)}
        />
      </div>
      {(showGenerateButton || showGenerateLanderModal) && (
        <GenerateLanderModal
          showGenerateLanderModal={showGenerateLanderModal}
          setShowGenerateLanderModal={setShowGenerateLanderModal}
          landerData={landerData}
          onGenerate={async ({ websiteUrl, prompt }) => {
            setIsGeneratingLander(true);

            const result = await executeAsync({
              workspaceId: workspaceId!,
              websiteUrl,
              prompt,
              landerData,
            });

            try {
              const data = programLanderSchema.parse(result?.data);
              if (!data.blocks.length) throw new Error("No blocks generated");

              setValue("landerData.blocks", data.blocks, { shouldDirty: true });
            } catch (e) {
              console.error("Error generating program lander content", e);
              toast.error(
                "Failed to generate landing page content. Please try again later.",
              );
            } finally {
              setIsGeneratingLander(false);
            }
          }}
        />
      )}
    </>
  );
}
