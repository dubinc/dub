"use client";

import { addProgramResourceAction } from "@/lib/actions/partners/program-resources/add-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type AddLinkModalProps = {
  showAddLinkModal: boolean;
  setShowAddLinkModal: Dispatch<SetStateAction<boolean>>;
};

const linkFormSchema = z.object({
  name: z.string().min(1, "Display name is required"),
  url: z.string().url("Please enter a valid URL"),
});

type LinkFormData = z.infer<typeof linkFormSchema>;

function AddLinkModal(props: AddLinkModalProps) {
  return (
    <Modal
      showModal={props.showAddLinkModal}
      setShowModal={props.setShowAddLinkModal}
    >
      <AddLinkModalInner {...props} />
    </Modal>
  );
}

function AddLinkModalInner({ setShowAddLinkModal }: AddLinkModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LinkFormData>({
    defaultValues: {
      name: "",
      url: "",
    },
  });

  const { executeAsync } = useAction(addProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowAddLinkModal(false);
      toast.success("Link added successfully!");
    },
    onError({ error }) {
      if (error.serverError) {
        setError("root.serverError", {
          message: error.serverError,
        });
        toast.error(error.serverError);
      } else {
        toast.error("Failed to add link");
      }
    },
  });

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Add link</h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: LinkFormData) => {
          await executeAsync({
            workspaceId: workspaceId!,
            name: data.name,
            resourceType: "link",
            url: data.url,
          });
        })}
      >
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="url"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                URL
              </label>

              <input
                id="url"
                type="url"
                placeholder="https://yoursite.com/brand"
                className={cn(
                  "block w-full rounded-md border-neutral-300 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm",
                  errors.url &&
                    "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                )}
                {...register("url", { required: "URL is required" })}
              />

              {errors.url && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.url.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Display name
              </label>

              <input
                id="name"
                type="text"
                placeholder="Brand guidelines"
                className={cn(
                  "block w-full rounded-md border-neutral-300 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm",
                  errors.name &&
                    "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                )}
                {...register("name", { required: "Display name is required" })}
              />

              {errors.name ? (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">
                  The display name that is shown to partners
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowAddLinkModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text="Add link"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useAddLinkModal() {
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  const AddLinkModalCallback = useCallback(() => {
    return (
      <AddLinkModal
        showAddLinkModal={showAddLinkModal}
        setShowAddLinkModal={setShowAddLinkModal}
      />
    );
  }, [showAddLinkModal, setShowAddLinkModal]);

  return useMemo(
    () => ({
      setShowAddLinkModal,
      AddLinkModal: AddLinkModalCallback,
    }),
    [setShowAddLinkModal, AddLinkModalCallback],
  );
}
