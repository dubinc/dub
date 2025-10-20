import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateApplicationSettingsAction } from "@/lib/actions/partners/update-auto-approve-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, Switch } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type FormData = {
  autoApprovePartners: boolean;
  marketplaceEnabled: boolean;
};

function ApplicationSettingsModal({
  showApplicationSettingsModal,
  setShowApplicationSettingsModal,
}: {
  showApplicationSettingsModal: boolean;
  setShowApplicationSettingsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      autoApprovePartners: program?.autoApprovePartnersEnabledAt ? true : false,
      marketplaceEnabled: program?.marketplaceEnabledAt ? true : false,
    },
  });

  const { executeAsync } = useAction(updateApplicationSettingsAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success("Application settings updated");
      mutatePrefix(["/api/partners", "/api/programs"]);
      setShowApplicationSettingsModal(false);
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) return;

    const result = await executeAsync({
      workspaceId: workspaceId!,
      ...data,
    });

    if (result?.serverError || result?.validationErrors) {
      setError("root.serverError", {
        message: "Failed to update application settings",
      });
      toast.error(
        parseActionError(result, "Failed to update application settings"),
      );
      return;
    }
  });

  return (
    <Modal
      showModal={showApplicationSettingsModal}
      setShowModal={setShowApplicationSettingsModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Application settings
        </h3>
      </div>

      <form onSubmit={onSubmit}>
        <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
          <label className="flex gap-3">
            <div>
              <Controller
                control={control}
                name="marketplaceEnabled"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    fn={field.onChange}
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
                  />
                )}
              />
            </div>
            <div className="flex select-none flex-col gap-0.5">
              <span className="text-content-emphasis text-sm font-medium">
                Show in the partner marketplace
              </span>
              <p className="text-content-subtle text-xs">
                Allow partners to discover your program.{" "}
                {/* <a
                  href=""
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-content-default underline"
                >
                  Learn more
                </a> */}
              </p>
            </div>
          </label>

          <label className="flex gap-3">
            <div>
              <Controller
                control={control}
                name="autoApprovePartners"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    fn={field.onChange}
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
                  />
                )}
              />
            </div>
            <div className="flex select-none flex-col gap-0.5">
              <span className="text-content-emphasis text-sm font-medium">
                Auto-approve partners
              </span>
              <p className="text-content-subtle text-xs">
                New applications will be automatically approved.{" "}
                <a
                  href="https://dub.co/help/article/program-applications#auto-approve"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-content-default underline"
                >
                  Learn more
                </a>
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowApplicationSettingsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            text="Save"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useApplicationSettingsModal() {
  const [showApplicationSettingsModal, setShowApplicationSettingsModal] =
    useState(false);

  const ApplicationSettingsModalCallback = useCallback(() => {
    return (
      <ApplicationSettingsModal
        showApplicationSettingsModal={showApplicationSettingsModal}
        setShowApplicationSettingsModal={setShowApplicationSettingsModal}
      />
    );
  }, [showApplicationSettingsModal, setShowApplicationSettingsModal]);

  return useMemo(
    () => ({
      setShowApplicationSettingsModal,
      ApplicationSettingsModal: ApplicationSettingsModalCallback,
    }),
    [setShowApplicationSettingsModal, ApplicationSettingsModalCallback],
  );
}
