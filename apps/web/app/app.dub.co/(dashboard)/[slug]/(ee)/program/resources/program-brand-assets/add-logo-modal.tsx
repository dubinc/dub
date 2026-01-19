"use client";

import { addProgramResourceAction } from "@/lib/actions/partners/program-resources/add-program-resource";
import { updateProgramResourceAction } from "@/lib/actions/partners/program-resources/update-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramResourceFile } from "@/lib/zod/schemas/program-resources";
import { Button, FileUpload, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
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
import * as z from "zod/v4";

type LogoModalProps = {
  showLogoModal: boolean;
  setShowLogoModal: Dispatch<SetStateAction<boolean>>;
  existingResource?: ProgramResourceFile;
};

// Define the form schema
const logoFormSchema = z.object({
  name: z.string(),
  file: z.string().optional(),
  extension: z.string().nullish(),
});

type LogoFormData = z.infer<typeof logoFormSchema>;

function LogoModal(props: LogoModalProps) {
  return (
    <Modal
      showModal={props.showLogoModal}
      setShowModal={props.setShowLogoModal}
    >
      <LogoModalInner {...props} />
    </Modal>
  );
}

function LogoModalInner({
  setShowLogoModal,
  existingResource,
}: LogoModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();
  const isEditing = Boolean(existingResource);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LogoFormData>({
    defaultValues: {
      name: existingResource?.name || "",
      file: "",
    },
  });

  // Track if user has selected a new file
  const [hasNewFile, setHasNewFile] = useState(false);

  const { executeAsync: executeAdd } = useAction(addProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowLogoModal(false);
      toast.success("Logo added successfully!");
    },
    onError({ error }) {
      if (error.serverError) {
        setError("root.serverError", {
          message: error.serverError,
        });
        toast.error(error.serverError);
      } else {
        toast.error("Failed to upload logo");
      }
    },
  });

  const { executeAsync: executeUpdate } = useAction(updateProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowLogoModal(false);
      toast.success("Logo updated successfully!");
    },
    onError({ error }) {
      if (error.serverError) {
        setError("root.serverError", {
          message: error.serverError,
        });
        toast.error(error.serverError);
      } else {
        toast.error("Failed to update logo");
      }
    },
  });

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          {isEditing ? "Edit logo" : "Add logo"}
        </h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: LogoFormData) => {
          if (isEditing && existingResource) {
            await executeUpdate({
              workspaceId: workspaceId!,
              resourceId: existingResource.id,
              resourceType: "logo",
              name: data.name,
              ...(hasNewFile && data.file
                ? { file: data.file, extension: data.extension }
                : {}),
            });
          } else {
            if (!data.file) {
              setError("file", { message: "Logo file is required" });
              return;
            }
            await executeAdd({
              workspaceId: workspaceId!,
              name: data.name,
              resourceType: "logo",
              file: data.file,
              extension: data.extension,
            });
          }
        })}
      >
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="logo-file"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Logo
              </label>
              <Controller
                control={control}
                name="file"
                rules={{ required: !isEditing ? "Logo file is required" : false }}
                render={({ field }) => (
                  <FileUpload
                    accept="programResourceImages"
                    className={cn(
                      "aspect-[4.2] w-full rounded-md border border-neutral-300",
                      errors.file && "border-red-300 ring-1 ring-red-500",
                    )}
                    iconClassName="size-5"
                    previewClassName="object-contain"
                    variant="plain"
                    imageSrc={field.value || existingResource?.url}
                    readFile
                    onChange={({ file, src }) => {
                      field.onChange(src);
                      setValue("extension", file.name.split(".").pop());
                      setHasNewFile(true);

                      // Set the logo name to the file name without extension if no name is provided
                      const currentName = getValues("name");
                      if (!currentName && file.name) {
                        const nameWithoutExtension = file.name
                          .split(".")
                          .slice(0, -1)
                          .join(".");
                        setValue("name", nameWithoutExtension || file.name);
                      }
                    }}
                    content={
                      isEditing
                        ? "Drop a new file to replace, or leave unchanged"
                        : "SVG, JPG, PNG, or WEBP, max size of 5MB"
                    }
                    maxFileSizeMB={5}
                  />
                )}
              />
              {errors.file && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.file.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                File name
              </label>
              <input
                id="name"
                type="text"
                className={cn(
                  "block w-full rounded-md border-neutral-300 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm",
                  errors.name &&
                    "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                )}
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowLogoModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text={isEditing ? "Save Changes" : "Add Logo"}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useLogoModal({
  existingResource,
}: { existingResource?: ProgramResourceFile } = {}) {
  const [showLogoModal, setShowLogoModal] = useState(false);

  const LogoModalCallback = useCallback(() => {
    return (
      <LogoModal
        showLogoModal={showLogoModal}
        setShowLogoModal={setShowLogoModal}
        existingResource={existingResource}
      />
    );
  }, [showLogoModal, setShowLogoModal, existingResource]);

  return useMemo(
    () => ({
      setShowLogoModal,
      LogoModal: LogoModalCallback,
    }),
    [setShowLogoModal, LogoModalCallback],
  );
}

// Keep backwards compatibility alias
export const useAddLogoModal = useLogoModal;
