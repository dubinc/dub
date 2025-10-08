"use client";

import { updateProgramResourceAction } from "@/lib/actions/partners/program-resources/update-program-resource";
import useProgramResources from "@/lib/swr/use-program-resources";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { HexColorPicker } from "react-colorful";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type EditColorModalProps = {
  showEditColorModal: boolean;
  setShowEditColorModal: Dispatch<SetStateAction<boolean>>;
  resourceId: string;
  initialName: string;
  initialColor: string;
};

const colorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
});

type ColorFormData = z.infer<typeof colorFormSchema>;

function EditColorModal(props: EditColorModalProps) {
  return (
    <Modal
      showModal={props.showEditColorModal}
      setShowModal={props.setShowEditColorModal}
    >
      <EditColorModalInner {...props} />
    </Modal>
  );
}

function EditColorModalInner({ 
  setShowEditColorModal, 
  resourceId, 
  initialName, 
  initialColor 
}: EditColorModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { mutate } = useProgramResources();
  const [hexInputValue, setHexInputValue] = useState(initialColor);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ColorFormData>({
    defaultValues: {
      name: initialName,
      color: initialColor,
    },
  });

  const selectedColor = watch("color");

  // Keep hex input in sync with form value
  useEffect(() => setHexInputValue(selectedColor), [selectedColor]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInputValue(value);

    // Only update form value if it's a valid hex color
    if (/^#?[0-9A-F]{6}$/i.test(value)) {
      setValue("color", value.startsWith("#") ? value : `#${value}`);
    }
  };

  const { executeAsync } = useAction(updateProgramResourceAction, {
    onSuccess: () => {
      mutate();
      setShowEditColorModal(false);
      toast.success("Color updated successfully!");
    },
    onError({ error }) {
      if (error.serverError) {
        setError("root.serverError", {
          message: error.serverError,
        });
        toast.error(error.serverError);
      } else {
        toast.error("Failed to update color");
      }
    },
  });

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Edit color</h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data: ColorFormData) => {
          await executeAsync({
            workspaceId: workspaceId!,
            resourceId,
            name: data.name,
            resourceType: "color",
            color: data.color,
          });
        })}
      >
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Color
              </span>
              <div className="flex justify-center [&_.react-colorful]:h-[180px] [&_.react-colorful]:w-full">
                <HexColorPicker
                  color={selectedColor}
                  onChange={(color) =>
                    setValue("color", color, { shouldDirty: true })
                  }
                />
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Hex
              </span>
              <input
                type="text"
                value={hexInputValue}
                onChange={handleHexInputChange}
                className={cn(
                  "block w-full rounded-md border-neutral-300 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm",
                  !/^#[0-9A-F]{6}$/i.test(hexInputValue) &&
                    "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                )}
                placeholder="#000000"
              />
              <input
                type="hidden"
                {...register("color", { required: "Please select a color" })}
              />
              {errors.color && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.color.message}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Color name
              </span>
              <input
                id="name"
                type="text"
                className={cn(
                  "block w-full rounded-md border-neutral-300 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm",
                  errors.name &&
                    "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                )}
                {...register("name", { required: "Color name is required" })}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowEditColorModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            autoFocus
            loading={isSubmitting || isSubmitSuccessful}
            text="Update Color"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useEditColorModal() {
  const [showEditColorModal, setShowEditColorModal] = useState(false);
  const [editData, setEditData] = useState<{
    resourceId: string;
    initialName: string;
    initialColor: string;
  } | null>(null);

  const openEditModal = useCallback((resourceId: string, initialName: string, initialColor: string) => {
    setEditData({ resourceId, initialName, initialColor });
    setShowEditColorModal(true);
  }, []);

  const EditColorModalCallback = useCallback(() => {
    if (!editData) return null;
    
    return (
      <EditColorModal
        showEditColorModal={showEditColorModal}
        setShowEditColorModal={setShowEditColorModal}
        resourceId={editData.resourceId}
        initialName={editData.initialName}
        initialColor={editData.initialColor}
      />
    );
  }, [showEditColorModal, setShowEditColorModal, editData]);

  return useMemo(
    () => ({
      openEditModal,
      EditColorModal: EditColorModalCallback,
    }),
    [openEditModal, EditColorModalCallback],
  );
}
