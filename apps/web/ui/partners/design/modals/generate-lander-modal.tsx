import useProgram from "@/lib/swr/use-program";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";

type GenerateLanderModalProps = {
  showGenerateLanderModal: boolean;
  setShowGenerateLanderModal: Dispatch<SetStateAction<boolean>>;
  onGenerate: (data: { websiteUrl: string }) => void;
};

export function GenerateLanderModal(props: GenerateLanderModalProps) {
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
