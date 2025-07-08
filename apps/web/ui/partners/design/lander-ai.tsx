import { generateLanderAction } from "@/lib/actions/partners/generate-lander";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingFormContext } from "./branding-form";

export function LanderAI() {
  const landerData = useWatch({ name: "landerData" });

  const [showGenerateLanderModal, setShowGenerateLanderModal] = useState(true);

  return (
    <GenerateLanderModal
      showGenerateLanderModal={showGenerateLanderModal}
      setShowGenerateLanderModal={setShowGenerateLanderModal}
    />
  );
}

type GenerateLanderModalProps = {
  showGenerateLanderModal: boolean;
  setShowGenerateLanderModal: Dispatch<SetStateAction<boolean>>;
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

function GenerateLanderModalInner({
  setShowGenerateLanderModal,
}: GenerateLanderModalProps) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { setValue: setValueParent } = useBrandingFormContext();

  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<{ websiteUrl: string }>({
    defaultValues: {
      websiteUrl: program?.url ?? "",
    },
  });

  const { executeAsync, isPending } = useAction(generateLanderAction, {
    async onSuccess() {
      toast.success("Landing page generated.");
      setShowGenerateLanderModal(false);
    },
    onError({ error }) {
      console.error(error);
    },
  });

  return (
    <>
      <form
        className="p-4 pt-3"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(async ({ websiteUrl }) => {
            const result = await executeAsync({
              workspaceId: workspaceId!,
              websiteUrl,
            });

            try {
              const data = programLanderSimpleSchema.parse(result?.data);
              if (!data.blocks.length) throw new Error("No blocks generated");

              setValueParent("landerData", data, { shouldDirty: true });
            } catch (e) {
              console.error("Error generating program lander", e);
              setError("root", { message: "Failed to generate landing page." });
              toast.error(
                "Failed to generate landing page. Please try again later.",
              );
            }
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
