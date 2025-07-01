import { uploadLanderImageAction } from "@/lib/actions/partners/upload-lander-image";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderImageBlockSchema } from "@/lib/zod/schemas/program-lander";
import { Button, FileUpload, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type ImageBlockFormData = z.infer<typeof programLanderImageBlockSchema>["data"];

type ImageBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<ImageBlockFormData>;
  onSubmit: (data: ImageBlockFormData) => void;
};

export function ImageBlockModal(props: ImageBlockModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <ImageBlockModalInner {...props} />
    </Modal>
  );
}

function ImageBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: ImageBlockModalProps) {
  const id = useId();

  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const {
    handleSubmit,
    register,
    control,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ImageBlockFormData>({
    defaultValues,
  });

  const [isUploading, setIsUploading] = useState(false);

  const { executeAsync } = useAction(uploadLanderImageAction);

  // Handle logo upload
  const handleUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const result = await executeAsync({
        workspaceId: workspaceId!,
      });

      if (!result?.data) throw new Error("Failed to get signed upload URL");

      const { signedUrl, destinationUrl } = result.data;

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload to signed URL");

      setValue("url", destinationUrl, { shouldDirty: true });
    } catch (e) {
      toast.error("Failed to upload image");
      console.error("Failed to upload image", e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} image
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);

              // Try to get the image dimensions
              try {
                const [width, height] = await new Promise<[number, number]>(
                  (resolve, reject) => {
                    const image = new Image();
                    image.src = data.url;
                    image.onload = () => resolve([image.width, image.height]);
                    image.onerror = () => reject();
                  },
                );

                data.width = width;
                data.height = height;
              } catch (e) {
                console.error("Failed to get image dimensions for", data.url);
              }

              onSubmit(data);
            })(e);
          }}
        >
          <div>
            <label
              htmlFor="logo-file"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Image
            </label>
            <Controller
              control={control}
              name="url"
              rules={{ required: true }}
              render={({ field }) => (
                <FileUpload
                  accept="programResourceImages"
                  className={cn(
                    "aspect-[4.2] w-full rounded-md border border-neutral-300",
                    errors.url && "border-red-300 ring-1 ring-red-500",
                  )}
                  iconClassName="size-5"
                  previewClassName="object-contain"
                  variant="plain"
                  imageSrc={field.value}
                  readFile
                  loading={isUploading}
                  onChange={({ file }) => handleUpload(file)}
                  content="SVG, JPG, PNG, or WEBP, max size of 5MB"
                  maxFileSizeMB={5}
                />
              )}
            />
            {errors.url && (
              <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${id}-alt`}
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Alt text
            </label>
            <input
              id={`${id}-alt`}
              type="text"
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm"
              {...register("alt")}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
            />
            <Button
              type="submit"
              variant="primary"
              text={defaultValues ? "Update" : "Add"}
              className="h-8 w-fit px-3"
              disabled={isUploading}
              loading={isSubmitting || isSubmitSuccessful}
            />
          </div>
        </form>
      </div>
    </>
  );
}

export function ImageBlockThumbnail() {
  return (
    <div className="relative aspect-[4/3] w-1/2 overflow-hidden rounded">
      <img
        src="https://assets.dub.co/misc/fun-thumbnail.jpg"
        className="object-cover"
      />
    </div>
  );
}
