import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { createGroupSchema } from "@/lib/zod/schemas/groups";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const generateRandomColor = () => {
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

interface CreateGroupSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.input<typeof createGroupSchema>;

function CreateGroupSheetContent({ setIsOpen }: CreateGroupSheetProps) {
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();
  const { makeRequest: createGroup, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      color: generateRandomColor(),
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    await createGroup("/api/groups", {
      method: "POST",
      body: data,
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
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  autoFocus
                  className={cn(
                    "block w-full rounded-md border-neutral-300 px-3 py-2 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.name &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("name", {
                    required: true,
                  })}
                  onChange={(e) => {
                    const name = e.target.value;
                    setValue("name", name);
                    setValue("slug", slugify(name));
                  }}
                  placeholder="Group name"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <div className="relative">
                    <div
                      className="h-6 w-6 cursor-pointer rounded-full border-none"
                      style={{
                        backgroundColor: watch("color") || "",
                      }}
                      onClick={() =>
                        document.getElementById("color-picker")?.click()
                      }
                    />
                    <input
                      id="color-picker"
                      type="color"
                      {...register("color", {
                        required: true,
                      })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      title="Choose group color"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                For internal use only, never visible to partners
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="slug"
              className="text-sm font-medium text-neutral-800"
            >
              Landing page slug
            </label>
            <div className="mt-2">
              <div className="flex">
                <div className="flex items-center rounded-l-md border-y border-l border-neutral-300 px-3 py-2 text-sm text-neutral-800">
                  partners.dub.co/{program?.slug}
                </div>
                <input
                  type="text"
                  id="slug"
                  className={cn(
                    "block w-full rounded-r-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.slug &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("slug", {
                    required: true,
                  })}
                  placeholder="group-name"
                />
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                For both internal and external use
              </p>
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
