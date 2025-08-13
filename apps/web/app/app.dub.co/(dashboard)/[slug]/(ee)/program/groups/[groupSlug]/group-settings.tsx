"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import { GroupProps } from "@/lib/types";
import {
  DEFAULT_PARTNER_GROUP,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { GroupColorPicker } from "@/ui/partners/groups/group-color-picker";
import { Button, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.input<typeof updateGroupSchema>;

export function GroupSettings() {
  const { group, loading, mutateGroup } = useGroup();

  if (!group || loading) {
    return <LoadingSpinner />;
  }

  return <GroupSettingsForm group={group} mutateGroup={mutateGroup} />;
}

function GroupSettingsForm({
  group,
  mutateGroup,
}: {
  group: GroupProps;
  mutateGroup: () => void;
}) {
  const router = useRouter();
  const { program } = useProgram();
  const { slug } = useParams<{ slug: string }>();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      name: group.name,
      slug: group.slug,
      color: group.color,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!group) {
      return;
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        toast.success("Group updated successfully!");

        // If slug changed, redirect to new URL
        if (data.slug !== group.slug) {
          router.push(`/${slug}/program/groups/${data.slug}`);
        }

        await mutateGroup();
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-neutral-200"
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-content-emphasis mb-4 text-base font-semibold">
            Settings
          </h2>
          <Button
            text="Save changes"
            className="h-8 w-fit"
            loading={isSubmitting}
            disabled={!isDirty}
          />
        </div>
        <div className="space-y-6">
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
                    setValue("name", name, { shouldDirty: true });
                    setValue("slug", slugify(name), { shouldDirty: true });
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

          {group.slug !== DEFAULT_PARTNER_GROUP.slug && (
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
          )}
        </div>
      </div>
    </form>
  );
}
