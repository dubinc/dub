import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { createGroupSchema } from "@/lib/zod/schemas/groups";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateGroupSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.input<typeof createGroupSchema>;

function CreateGroupSheetContent({ setIsOpen }: CreateGroupSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    await makeRequest("/api/groups", {
      method: "POST",
      body: {
        ...data,
        slug: data.name.toLowerCase(),
        color: "##0000"
      },
      onSuccess: () => {
        toast.success("Group created successfully!");
        setIsOpen(false);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Create group
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-neutral-800"
            >
              Name
            </label>
            <div className="mt-2">
              <input
                type="text"
                id="name"
                className={cn(
                  "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.name &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("name", {
                  required: "Nme is required",
                })}
                placeholder="Group name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            text="Create group"
            className="w-fit"
            loading={isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}

export function CreateGroupSheet({
  isOpen,
  nested,
  ...rest
}: CreateGroupSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <CreateGroupSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateGroupSheet(
  props: { nested?: boolean } & Omit<CreateGroupSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createGroupSheet: (
      <CreateGroupSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
