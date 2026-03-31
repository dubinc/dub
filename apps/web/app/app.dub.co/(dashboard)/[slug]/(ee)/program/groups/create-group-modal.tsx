import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { createGroupSchema } from "@/lib/zod/schemas/groups";
import { RESOURCE_COLORS } from "@/ui/colors";
import { GroupColorPicker } from "@/ui/partners/groups/group-color-picker";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

interface CreateGroupModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.input<typeof createGroupSchema>;

function CreateGroupModalContent({ setIsOpen }: CreateGroupModalProps) {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest: createGroup, isSubmitting } = useApiMutation();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      color:
        RESOURCE_COLORS[Math.floor(Math.random() * RESOURCE_COLORS.length)],
    },
  });

  const onSubmit = async (data: FormData) => {
    await createGroup("/api/groups", {
      method: "POST",
      body: data,
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        setIsOpen(false);
        toast.success(`Group ${data.name} created successfully`);
        router.push(`/${slug}/program/groups/${data.slug}`);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">Create group</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-neutral-800"
            >
              Group name
            </label>
            <div className="mt-1.5">
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
                  <Controller
                    control={control}
                    name="color"
                    render={({ field }) => (
                      <GroupColorPicker
                        color={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
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
              Group slug
            </label>
            <div className="mt-1.5">
              <input
                type="text"
                id="slug"
                className={cn(
                  "block w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.slug &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("slug", {
                  required: true,
                })}
                placeholder="group-name"
              />
              <p className="mt-2 text-xs text-neutral-500">
                For program landing page and internal group page URLs
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

export function CreateGroupModal({
  isOpen,
  setIsOpen,
}: CreateGroupModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <CreateGroupModalContent setIsOpen={setIsOpen} />
    </Modal>
  );
}

export function useCreateGroupModal(
  props: Omit<CreateGroupModalProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createGroupModal: (
      <CreateGroupModal setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
