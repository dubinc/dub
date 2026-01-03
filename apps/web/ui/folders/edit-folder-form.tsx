import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import {
  FOLDER_MAX_DESCRIPTION_LENGTH,
  updateFolderSchema,
} from "@/lib/zod/schemas/folders";
import { Button, useEnterSubmit } from "@dub/ui";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { MaxCharactersCounter } from "../shared/max-characters-counter";

export function EditFolderForm({
  folder,
}: {
  folder: Pick<Folder, "id" | "name" | "description">;
}) {
  const { id: workspaceId } = useWorkspace();

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<Pick<z.infer<typeof updateFolderSchema>, "name" | "description">>(
    {
      defaultValues: {
        name: folder.name,
        description: folder.description,
      },
    },
  );

  const { handleKeyDown } = useEnterSubmit();

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const response = await fetch(
          `/api/folders/${folder.id}?workspaceId=${workspaceId}`,
          {
            method: "PATCH",
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error.message);
          return;
        }

        reset(data);
        mutatePrefix("/api/folders");
        toast.success("Folder updated successfully!");
      })}
    >
      <label>
        <span className="text-content-emphasis block text-sm font-medium">
          Name
        </span>
        <div className="mt-2 flex rounded-md">
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            placeholder="Acme Links"
            {...register("name", { required: true })}
          />
        </div>
      </label>

      <label className="mt-6 block">
        <span className="text-content-emphasis block text-sm font-medium">
          Description <span className="text-content-subtle">(optional)</span>
        </span>
        <textarea
          className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          rows={4}
          maxLength={FOLDER_MAX_DESCRIPTION_LENGTH}
          onKeyDown={handleKeyDown}
          {...register("description", {
            maxLength: FOLDER_MAX_DESCRIPTION_LENGTH,
          })}
        />
        <MaxCharactersCounter
          control={control}
          name="description"
          maxLength={FOLDER_MAX_DESCRIPTION_LENGTH}
        />
      </label>

      <Button
        type="submit"
        className="mt-6 h-8 w-fit rounded-lg px-3"
        disabled={!isDirty}
        loading={isSubmitting}
        text="Save changes"
      />
    </form>
  );
}
