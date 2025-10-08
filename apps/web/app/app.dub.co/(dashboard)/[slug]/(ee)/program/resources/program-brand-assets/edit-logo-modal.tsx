"use client";

import { updateProgramResourceAction } from "@/lib/actions/partners/program-resources/update-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
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
import { z } from "zod";

type EditLogoModalProps = {
  showEditLogoModal: boolean;
  setShowEditLogoModal: Dispatch<SetStateAction<boolean>>;
  resourceId: string;
  initialName: string;
  initialUrl: string;
  initialExtension?: string;
};

// Define the form schema
const logoFormSchema = z.object({
  name: z.string(),
  file: z.string().min(1, "Logo file is required"),
  extension: z.string().nullish(),
});

type LogoFormData = z.infer<typeof logoFormSchema>;

function EditLogoModal(props: EditLogoModalProps) {
  return (
    <Modal
      showModal={props.showEditLogoModal}
      setShowModal={props.setShowEditLogoModal}
    >
      <EditLogoModalInner {...props} />
    </Modal>
  );
}

function EditLogoModalInner({ 
  setShowEditLogoModal, 
  resourceId, 
  initialName, 
  initialUrl, 
  initialExtension 
}: EditLogoModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();

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
      name: initialName,
      file: initialUrl,
    },
  });

  const { executeAsync } = useAction(updateProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowEditLogoModal(false);
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
        <h3 className="text-lg font-medium leading-none">Edit logo</h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: LogoFormData) => {
          await executeAsync({
            workspaceId: workspaceId!,
            resourceId,
            name: data.name,
            resourceType: "logo",
            file: data.file,
            extension: data.extension,
          });
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
                rules={{ required: "Logo file is required" }}
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
                    imageSrc={field.value}
                    readFile
                    onChange={({ file, src }) => {
                      field.onChange(src);
                      setValue("extension", file.name.split(".").pop());

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
                    content="SVG, JPG, PNG, or WEBP, max size of 5MB"
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
            onClick={() => setShowEditLogoModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text="Update Logo"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useEditLogoModal() {
  const [showEditLogoModal, setShowEditLogoModal] = useState(false);
  const [editData, setEditData] = useState<{
    resourceId: string;
    initialName: string;
    initialUrl: string;
    initialExtension?: string;
  } | null>(null);

  const openEditModal = useCallback((resourceId: string, initialName: string, initialUrl: string, initialExtension?: string) => {
    setEditData({ resourceId, initialName, initialUrl, initialExtension });
    setShowEditLogoModal(true);
  }, []);

  const EditLogoModalCallback = useCallback(() => {
    if (!editData) return null;
    
    return (
      <EditLogoModal
        showEditLogoModal={showEditLogoModal}
        setShowEditLogoModal={setShowEditLogoModal}
        resourceId={editData.resourceId}
        initialName={editData.initialName}
        initialUrl={editData.initialUrl}
        initialExtension={editData.initialExtension}
      />
    );
  }, [showEditLogoModal, setShowEditLogoModal, editData]);

  return useMemo(
    () => ({
      openEditModal,
      EditLogoModal: EditLogoModalCallback,
    }),
    [openEditModal, EditLogoModalCallback],
  );
}
