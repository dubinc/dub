import { generateLanderAction } from "@/lib/actions/partners/generate-lander";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { X } from "@/ui/shared/icons";
import { Button, Grid, LoadingSpinner, Sparkle3 } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";
import { GenerateLanderModal } from "./modals/generate-lander-modal";

export function LanderAIBanner() {
  const { id: workspaceId } = useWorkspace();

  const landerData = useWatch({ name: "landerData" });
  const { setValue } = useBrandingFormContext();

  const [showGenerateLanderModal, setShowGenerateLanderModal] = useState(false);

  const {
    isGeneratingLander,
    setIsGeneratingLander,
    isGenerateBannerHidden,
    setIsGenerateBannerHidden,
  } = useBrandingContext();

  const { executeAsync } = useAction(generateLanderAction, {
    async onSuccess() {
      toast.success("Landing page generated.");
    },
    onError({ error }) {
      console.error(error);
    },
  });

  const showBanner = !isGenerateBannerHidden && landerData?.blocks.length === 0;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative rounded-t-xl bg-neutral-200 p-2">
              <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                <Grid
                  cellSize={30}
                  patternOffset={[0, -6]}
                  className="inset-[unset] inset-y-0 left-1/2 w-[1200px] -translate-x-1/2 text-neutral-300"
                />
              </div>

              <div className="relative flex items-center justify-between gap-2">
                <div className="basis-0" />
                <div className="flex grow items-center justify-center gap-2">
                  <Sparkle3 className="text-content-emphasis hidden size-4 shrink-0 sm:block" />
                  <span className="text-content-emphasis text-left text-sm font-medium">
                    Generate your program landing page based on your website
                  </span>
                  <Button
                    variant="success"
                    text="Generate"
                    className="ml-2 h-7 w-fit rounded-lg px-2.5"
                    onClick={() => setShowGenerateLanderModal(true)}
                    {...(isGeneratingLander && {
                      disabled: true,
                      icon: <LoadingSpinner className="size-3" />,
                    })}
                  />
                </div>
                <div className="basis-0">
                  <Button
                    variant="outline"
                    icon={<X className="size-4" />}
                    className="size-7 rounded-lg bg-black/5 p-0 backdrop-blur-sm hover:bg-black/10 active:bg-black/15"
                    onClick={() => setIsGenerateBannerHidden(true)}
                  />
                </div>
              </div>

              {/* Space filler */}
              <div className="absolute inset-x-0 top-full h-2 bg-neutral-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {(showBanner || showGenerateLanderModal) && (
        <GenerateLanderModal
          showGenerateLanderModal={showGenerateLanderModal}
          setShowGenerateLanderModal={setShowGenerateLanderModal}
          onGenerate={async ({ websiteUrl }) => {
            setIsGeneratingLander(true);

            const result = await executeAsync({
              workspaceId: workspaceId!,
              websiteUrl,
            });

            try {
              const data = programLanderSimpleSchema.parse(result?.data);
              if (!data.blocks.length) throw new Error("No blocks generated");

              setValue("landerData.blocks", data.blocks, { shouldDirty: true });
            } catch (e) {
              console.error("Error generating program lander", e);
              toast.error(
                "Failed to generate landing page. Please try again later.",
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
