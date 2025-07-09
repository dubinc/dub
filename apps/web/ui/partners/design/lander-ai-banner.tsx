import { generateLanderAction } from "@/lib/actions/partners/generate-lander";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronDown,
  Grid,
  LoadingSpinner,
  Popover,
  Sparkle3,
  useMediaQuery,
} from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, PropsWithChildren, SetStateAction, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";

export function LanderAIBanner() {
  const { id: workspaceId } = useWorkspace();

  const landerData = useWatch({ name: "landerData" });
  const { setValue } = useBrandingFormContext();

  const [bannerHidden, setBannerHidden] = useState(false);
  const [showGenerateLanderPopover, setShowGenerateLanderPopover] =
    useState(false);

  const { isGeneratingLander, setIsGeneratingLander } = useBrandingContext();

  const { executeAsync } = useAction(generateLanderAction, {
    async onSuccess() {
      toast.success("Landing page generated.");
    },
    onError({ error }) {
      console.error(error);
    },
  });

  const showBanner = !bannerHidden && landerData?.blocks.length === 0;

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
                  <GenerateLanderPopover
                    showGenerateLanderPopover={showGenerateLanderPopover}
                    setShowGenerateLanderPopover={setShowGenerateLanderPopover}
                    onGenerate={async ({ websiteUrl }) => {
                      setShowGenerateLanderPopover(false);
                      setIsGeneratingLander(true);

                      const result = await executeAsync({
                        workspaceId: workspaceId!,
                        websiteUrl,
                      });

                      try {
                        const data = programLanderSimpleSchema.parse(
                          result?.data,
                        );
                        if (!data.blocks.length)
                          throw new Error("No blocks generated");

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
                  >
                    <Button
                      variant="success"
                      className="group ml-2 h-7 w-fit rounded-lg pl-2.5 pr-2 data-[state=open]:bg-blue-600 data-[state=open]:ring-4 data-[state=open]:ring-blue-200"
                      text={
                        <div className="flex items-center gap-1">
                          <span>Generate</span>
                          <ChevronDown className="size-2.5 shrink-0 text-white transition-transform duration-75 group-data-[state=open]:-scale-y-100 [&_*]:stroke-2" />
                        </div>
                      }
                      onClick={() => setShowGenerateLanderPopover(true)}
                      {...(isGeneratingLander && {
                        disabled: true,
                        icon: <LoadingSpinner className="size-3" />,
                      })}
                    />
                  </GenerateLanderPopover>
                </div>
                <div className="basis-0">
                  <Button
                    variant="outline"
                    icon={<X className="size-4" />}
                    className="size-7 rounded-lg bg-black/5 p-0 backdrop-blur-sm hover:bg-black/10 active:bg-black/15"
                    onClick={() => setBannerHidden(true)}
                  />
                </div>
              </div>

              {/* Space filler */}
              <div className="absolute inset-x-0 top-full h-2 bg-neutral-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type GenerateLanderPopoverProps = {
  showGenerateLanderPopover: boolean;
  setShowGenerateLanderPopover: Dispatch<SetStateAction<boolean>>;
  onGenerate: (data: { websiteUrl: string }) => void;
};

function GenerateLanderPopover({
  children,
  ...props
}: PropsWithChildren<GenerateLanderPopoverProps>) {
  return (
    <Popover
      openPopover={props.showGenerateLanderPopover}
      setOpenPopover={props.setShowGenerateLanderPopover}
      align="end"
      side="bottom"
      content={<GenerateLanderPopoverInner {...props} />}
    >
      {children}
    </Popover>
  );
}

function GenerateLanderPopoverInner({
  onGenerate,
}: Pick<GenerateLanderPopoverProps, "onGenerate">) {
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
          handleSubmit(
            async ({ websiteUrl }) => await onGenerate({ websiteUrl }),
          )(e);
        }}
      >
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-6">
            {/* Title */}
            <label>
              <span className="block text-sm font-medium text-neutral-700">
                Your website URL
              </span>
              <div className="mt-1.5 rounded-md shadow-sm">
                <input
                  type="text"
                  placeholder="https://dub.co"
                  autoFocus={!isMobile}
                  className="block w-full min-w-32 rounded-md border-neutral-300 py-1.5 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register("websiteUrl", { required: true })}
                />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || isSubmitSuccessful}
              text="Generate"
              className="h-[34px] w-fit"
            />
          </div>
        </div>
      </form>
    </>
  );
}
