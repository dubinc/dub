"use client";

import { updateProgramResourceAction } from "@/lib/actions/partners/program-resources/update-program-resource";
import { storage } from "@/lib/storage";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, FileContent, FileUpload, Modal } from "@dub/ui";
import { cn, R2_URL, truncate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type EditFileModalProps = {
  showEditFileModal: boolean;
  setShowEditFileModal: Dispatch<SetStateAction<boolean>>;
  resourceId: string;
  initialName: string;
  initialUrl: string;
  initialExtension?: string;
};

// Define the form schema
const fileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  file: z.string().min(1, "File is required"),
  extension: z.string().nullish(),
});

type FileFormData = z.infer<typeof fileFormSchema>;

// Helper function to check if a string is a valid URL
const isValidUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
};

// Helper function to check if a string is base64 data
const isBase64Data = (str: string): boolean => {
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  const dataImageRegex =
    /^data:image\/[a-zA-Z0-9.+-]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(str) || dataImageRegex.test(str);
};

// Helper function to calculate file size from base64 string
const getBase64FileSize = (base64String: string): number => {
  const base64Data = base64String.replace(/^data:.+;base64,/, "");
  return Math.ceil((base64Data.length * 3) / 4);
};

// Helper function to extract object key from R2 URL
const extractObjectKeyFromUrl = (url: string): string | null => {
  if (url.startsWith(R2_URL)) {
    return url.replace(`${R2_URL}/`, "");
  }
  return null;
};

function EditFileModal(props: EditFileModalProps) {
  return (
    <Modal
      showModal={props.showEditFileModal}
      setShowModal={props.setShowEditFileModal}
    >
      <EditFileModalInner {...props} />
    </Modal>
  );
}

function EditFileModalInner({
  setShowEditFileModal,
  resourceId,
  initialName,
  initialUrl,
  initialExtension,
}: EditFileModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FileFormData>({
    defaultValues: {
      name: initialName,
      file: initialUrl,
      extension: initialExtension ?? undefined,
    },
  });

  const [fileName, setFileName] = useState(initialName);

  // Reset form when resource data changes
  useEffect(() => {
    reset({
      name: initialName,
      file: initialUrl,
      extension: initialExtension ?? undefined,
    });
    setFileName(initialName);
  }, [initialName, initialUrl, initialExtension, reset]);

  const { executeAsync } = useAction(updateProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowEditFileModal(false);
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
  });

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Edit file</h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: FileFormData) => {
          await executeAsync({
            workspaceId: workspaceId!,
            resourceId,
            name: data.name,
            resourceType: "file",
            file: data.file,
            extension: data.extension,
          });
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
                name="file"
                rules={{ required: "File is required" }}
                render={({ field }) => (
                  <FileUpload
                    accept="programResourceFiles"
                    className={cn(
                      "aspect-[4.2] w-full rounded-md border border-neutral-300",
                      errors.file && "border-red-300 ring-1 ring-red-500",
                    )}
                    iconClassName="size-5"
                    variant="plain"
                    readFile
                    onChange={async ({ file, src }) => {
                      setFileName(file.name);
                      setValue("extension", file.name.split(".").pop());

                      // Set the file name to the file name without extension if no name is provided
                      const currentName = getValues("name");
                      if (!currentName && file.name) {
                        const nameWithoutExtension = file.name
                          .split(".")
                          .slice(0, -1)
                          .join(".");
                        setValue("name", nameWithoutExtension || file.name);
                      }

                      try {
                        // If the provided value is already a valid URL, skip upload
                        if (isValidUrl(src)) {
                          field.onChange(src);
                          return;
                        }

                        // If it's base64 data, validate size and upload
                        if (isBase64Data(src)) {
                          const fileSize = getBase64FileSize(src);
                          const maxSizeBytes = 10 * 1024 * 1024; // 10MB

                          if (fileSize > maxSizeBytes) {
                            setError("file", {
                              message:
                                "File size is too large. Maximum size is 10MB.",
                            });
                            toast.error(
                              "File size is too large. Maximum size is 10MB.",
                            );
                            return;
                          }

                          // Delete old file if it exists and is different from the new one
                          const currentValue = getValues("file");
                          if (
                            currentValue &&
                            currentValue !== src &&
                            isValidUrl(currentValue)
                          ) {
                            const oldObjectKey =
                              extractObjectKeyFromUrl(currentValue);
                            if (oldObjectKey) {
                              try {
                                await storage.delete(oldObjectKey);
                              } catch (error) {
                                console.error(
                                  "Failed to delete old file:",
                                  error,
                                );
                                // Continue with upload even if deletion fails
                              }
                            }
                          }

                          // Upload the new file
                          const fileKey = `programs/${workspaceId}/files/${file.name.split(".").slice(0, -1).join(".")}-${Date.now()}${file.name.split(".").pop() ? `.${file.name.split(".").pop()}` : ""}`;
                          const uploadResult = await storage.upload(
                            fileKey,
                            src,
                          );

                          if (!uploadResult || !uploadResult.url) {
                            throw new Error("Failed to upload file");
                          }

                          field.onChange(uploadResult.url);
                        } else {
                          // If it's neither a URL nor base64, treat as invalid
                          setError("file", {
                            message: "Invalid file format",
                          });
                          toast.error("Invalid file format");
                        }
                      } catch (error) {
                        console.error("File upload error:", error);
                        setError("file", {
                          message:
                            error instanceof Error
                              ? error.message
                              : "Failed to upload file",
                        });
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Failed to upload file",
                        );
                      }
                    }}
                    icon={field.value ? FileContent : undefined}
                    content={
                      field.value
                        ? truncate(fileName, 25)
                        : "Any document or zip file, max size of 10MB"
                    }
                    maxFileSizeMB={10}
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
            onClick={() => setShowEditFileModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text="Update File"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useEditFileModal() {
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editData, setEditData] = useState<{
    resourceId: string;
    initialName: string;
    initialUrl: string;
    initialExtension?: string;
  } | null>(null);

  const openEditModal = useCallback(
    (
      resourceId: string,
      initialName: string,
      initialUrl: string,
      initialExtension?: string,
    ) => {
      setEditData({ resourceId, initialName, initialUrl, initialExtension });
      setShowEditFileModal(true);
    },
    [],
  );

  const EditFileModalCallback = useCallback(() => {
    if (!editData) return null;

    return (
      <EditFileModal
        showEditFileModal={showEditFileModal}
        setShowEditFileModal={setShowEditFileModal}
        resourceId={editData.resourceId}
        initialName={editData.initialName}
        initialUrl={editData.initialUrl}
        initialExtension={editData.initialExtension}
      />
    );
  }, [showEditFileModal, setShowEditFileModal, editData]);

  return useMemo(
    () => ({
      openEditModal,
      EditFileModal: EditFileModalCallback,
    }),
    [openEditModal, EditFileModalCallback],
  );
}
