"use client";

import { addProgramResourceAction } from "@/lib/actions/partners/program-resources/add-program-resource";
import { updateProgramResourceAction } from "@/lib/actions/partners/program-resources/update-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramResourceFile } from "@/lib/zod/schemas/program-resources";
import { Button, FileContent, FileUpload, Modal } from "@dub/ui";
import { cn, truncate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { useUploadProgramResource } from "./use-upload-program-resource";

type FileModalProps = {
  showFileModal: boolean;
  setShowFileModal: Dispatch<SetStateAction<boolean>>;
  existingResource?: ProgramResourceFile;
};

const fileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  hasFile: z.boolean().optional(),
  extension: z.string().nullish(),
});

type FileFormData = z.infer<typeof fileFormSchema>;

function FileModal(props: FileModalProps) {
  return (
    <Modal
      showModal={props.showFileModal}
      setShowModal={props.setShowFileModal}
    >
      <FileModalInner {...props} />
    </Modal>
  );
}

function FileModalInner({
  setShowFileModal,
  existingResource,
}: FileModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();
  const isEditing = Boolean(existingResource);

  const rawFileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState(existingResource?.name || "");
  const [hasNewFile, setHasNewFile] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FileFormData>({
    defaultValues: {
      name: existingResource?.name || "",
      hasFile: false,
    },
  });

  const { upload } = useUploadProgramResource(workspaceId!);

  const { executeAsync: executeAdd } = useAction(addProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowFileModal(false);
      toast.success("File added successfully!");
    },
    onError({ error }) {
      if (error.serverError) {
        setError("root.serverError", {
          message: error.serverError,
        });
        toast.error(error.serverError);
      } else {
        toast.error("Failed to add file");
      }
    },
  });

  const { executeAsync: executeUpdate } = useAction(
    updateProgramResourceAction,
    {
      onSuccess: () => {
        mutate();
        setShowFileModal(false);
        toast.success("File updated successfully!");
      },
      onError({ error }) {
        if (error.serverError) {
          setError("root.serverError", {
            message: error.serverError,
          });
          toast.error(error.serverError);
        } else {
          toast.error("Failed to update file");
        }
      },
    },
  );

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          {isEditing ? "Edit file" : "Add file"}
        </h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: FileFormData) => {
          try {
            if (isEditing && existingResource) {
              let uploadedKey: string | undefined;
              let uploadedFileSize: number | undefined;

              if (hasNewFile && rawFileRef.current) {
                const { key, fileSize } = await upload({
                  file: rawFileRef.current,
                  resourceType: "file",
                  name: data.name,
                  extension: data.extension ?? undefined,
                });
                uploadedKey = key;
                uploadedFileSize = fileSize;
              }

              await executeUpdate({
                workspaceId: workspaceId!,
                resourceId: existingResource.id,
                resourceType: "file",
                name: data.name,
                ...(uploadedKey
                  ? { key: uploadedKey, fileSize: uploadedFileSize }
                  : {}),
              });
            } else {
              if (!rawFileRef.current) {
                setError("hasFile", { message: "File is required" });
                return;
              }

              const { key, fileSize } = await upload({
                file: rawFileRef.current,
                resourceType: "file",
                name: data.name,
                extension: data.extension ?? undefined,
              });

              await executeAdd({
                workspaceId: workspaceId!,
                name: data.name,
                resourceType: "file",
                key,
                fileSize,
              });
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Something went wrong";
            toast.error(message);
          }
        })}
      >
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                File
              </label>
              <Controller
                control={control}
                name="hasFile"
                rules={{
                  validate: (v) =>
                    !isEditing && !v ? "File is required" : true,
                }}
                render={({ field }) => (
                  <FileUpload
                    accept="programResourceFiles"
                    className={cn(
                      "aspect-[4.2] w-full rounded-md border border-neutral-300",
                      errors.hasFile && "border-red-300 ring-1 ring-red-500",
                    )}
                    iconClassName="size-5"
                    variant="plain"
                    readFile
                    onChange={({ file, src }) => {
                      rawFileRef.current = file;
                      setFileName(file.name);
                      field.onChange(true);
                      setValue("extension", file.name.split(".").pop());
                      setHasNewFile(true);

                      const currentName = getValues("name");
                      if (!currentName && file.name) {
                        const nameWithoutExtension = file.name
                          .split(".")
                          .slice(0, -1)
                          .join(".");
                        setValue("name", nameWithoutExtension || file.name);
                      }
                    }}
                    icon={field.value || isEditing ? FileContent : undefined}
                    content={
                      field.value
                        ? truncate(fileName, 25)
                        : isEditing
                          ? `Current: ${truncate(existingResource?.name || "", 25)} (drop to replace)`
                          : "Any document or zip file, max size of 10MB"
                    }
                    maxFileSizeMB={10}
                  />
                )}
              />
              {errors.hasFile && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.hasFile.message}
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
            onClick={() => setShowFileModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text={isEditing ? "Save Changes" : "Add File"}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useFileModal({
  existingResource,
}: { existingResource?: ProgramResourceFile } = {}) {
  const [showFileModal, setShowFileModal] = useState(false);

  const FileModalCallback = useCallback(() => {
    return (
      <FileModal
        showFileModal={showFileModal}
        setShowFileModal={setShowFileModal}
        existingResource={existingResource}
      />
    );
  }, [showFileModal, setShowFileModal, existingResource]);

  return useMemo(
    () => ({
      setShowFileModal,
      FileModal: FileModalCallback,
    }),
    [setShowFileModal, FileModalCallback],
  );
}

// Keep backwards compatibility alias
export const useAddFileModal = useFileModal;
