import { generateLanderAction } from "@/lib/actions/partners/generate-lander";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Grid,
  LoadingSpinner,
  Modal,
  Sparkle3,
  useMediaQuery,
} from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";

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

              setValue("landerData", data, { shouldDirty: true });
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

type GenerateLanderModalProps = {
  showGenerateLanderModal: boolean;
  setShowGenerateLanderModal: Dispatch<SetStateAction<boolean>>;
  onGenerate: (data: { websiteUrl: string }) => void;
};

function GenerateLanderModal(props: GenerateLanderModalProps) {
  return (
    <Modal
      showModal={props.showGenerateLanderModal}
      setShowModal={props.setShowGenerateLanderModal}
    >
      <GenerateLanderModalInner {...props} />
    </Modal>
  );
}

function GenerateLanderModalInner({ setShowGenerateLanderModal, onGenerate }) {
  const { isMobile } = useMediaQuery();
  const { program } = useProgram();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<{ websiteUrl: string }>({
    defaultValues: {
      websiteUrl: program?.url ?? "",
    },
  });

  return (
    <>
      <form
        className="p-4 pt-3"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(async ({ websiteUrl }) => {
            setShowGenerateLanderModal(false);
            onGenerate({ websiteUrl });
          })(e);
        }}
      >
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Generate a new landing page
        </h3>
        <p className="text-content-subtle mt-2 text-sm">
          We'll use AI to generate a new landing page for your program, based on
          content from your own website.
        </p>

        <div className="mt-4 flex flex-col gap-6">
          {/* Title */}
          <label>
            <span className="block text-sm font-medium text-neutral-700">
              Website URL
            </span>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                type="text"
                placeholder="https://dub.co"
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("websiteUrl")}
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => setShowGenerateLanderModal(false)}
          />
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || isSubmitSuccessful}
            text="Generate"
            className="h-9 w-fit"
          />
        </div>
      </form>
    </>
  );
}
