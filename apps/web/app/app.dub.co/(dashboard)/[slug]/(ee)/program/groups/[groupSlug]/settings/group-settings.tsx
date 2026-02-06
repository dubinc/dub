"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import {
  DEFAULT_PARTNER_GROUP,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { GroupColorPicker } from "@/ui/partners/groups/group-color-picker";
import { GroupSettingsRow } from "@/ui/partners/groups/group-settings-row";
import { Button, CopyButton } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type FormData = z.input<typeof updateGroupSchema>;

const GROUP_NAME_DESCRIPTION =
  "For internal use only, never visible to partners.";
const GROUP_SLUG_DESCRIPTION =
  "For [program landing page](https://dub.co/help/article/program-landing-page) and internal group page URLs";
const GROUP_ID_DESCRIPTION =
  "For setting up the [Embedded Referral Dashboard](https://dub.co/docs/partners/embedded-referrals) within your app.";

export function GroupSettings() {
  const { group, loading } = useGroup();
  return <GroupSettingsForm group={group ?? null} loading={loading} />;
}

function GroupSettingsForm({
  group,
  loading,
}: {
  group: GroupProps | null;
  loading: boolean;
}) {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      name: group?.name ?? "",
      slug: group?.slug ?? "",
      color: group?.color ?? null,
    },
  });

  useEffect(() => {
    if (group) {
      reset({
        name: group.name,
        slug: group.slug,
        color: group.color,
      });
    }
  }, [group, reset]);

  const onSubmit = async (data: FormData) => {
    if (!group) return;
    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        if (data.slug !== group.slug) {
          router.push(`/${slug}/program/groups/${data.slug}/settings`);
        }
        toast.success("Group updated successfully!");
      },
    });
  };

  const isLoading = loading || !group;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border-subtle rounded-lg border"
    >
      <div className="flex flex-col divide-y divide-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Group settings
          </h3>
        </div>
        <GroupSettingsRow
          heading="Group name"
          description={GROUP_NAME_DESCRIPTION}
        >
          {isLoading ? (
            <div className="h-[38px] w-full animate-pulse rounded-md bg-neutral-200" />
          ) : (
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

                  if (group!.slug !== DEFAULT_PARTNER_GROUP.slug) {
                    setValue("slug", slugify(name), { shouldDirty: true });
                  }
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
          )}
        </GroupSettingsRow>

        {(isLoading ||
          (group && group.slug !== DEFAULT_PARTNER_GROUP.slug)) && (
          <GroupSettingsRow
            heading="Group slug"
            description={GROUP_SLUG_DESCRIPTION}
          >
            {isLoading ? (
              <div className="h-[38px] w-full animate-pulse rounded-md bg-neutral-200" />
            ) : (
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
            )}
          </GroupSettingsRow>
        )}

        <GroupSettingsRow heading="Group ID" description={GROUP_ID_DESCRIPTION}>
          {isLoading ? (
            <div className="h-[38px] w-full animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <div className="relative">
              <input
                type="text"
                readOnly
                className="block w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 pr-12 font-mono text-sm text-neutral-600 focus:border-neutral-300 focus:ring-0"
                defaultValue={group!.id}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <CopyButton
                  value={group!.id}
                  onCopy={() => {
                    toast.success("Group ID copied to clipboard!");
                  }}
                />
              </div>
            </div>
          )}
        </GroupSettingsRow>
      </div>

      <div className="border-border-subtle flex items-center justify-end rounded-b-lg border-t bg-neutral-50 px-6 py-4">
        <div>
          <Button
            text="Save changes"
            className="h-8"
            loading={isSubmitting}
            disabled={!isDirty || isLoading}
          />
        </div>
      </div>
    </form>
  );
}
