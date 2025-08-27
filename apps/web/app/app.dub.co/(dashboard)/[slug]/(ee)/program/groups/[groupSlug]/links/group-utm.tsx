"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { UTMTemplateSchema } from "@/lib/zod/schemas/utm";
import { Button, UTMBuilder } from "@dub/ui";
import { PropsWithChildren, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = {
  utmTemplateId?: string | null;
} & z.infer<typeof UTMTemplateSchema>;

export function GroupUTM() {
  const { group, loading } = useGroup();
  const { id: workspaceId } = useWorkspace();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      utmTemplateId: group?.utmTemplate?.id || null,
      utm_source: (group?.utmTemplate as any)?.utm_source || "",
      utm_medium: (group?.utmTemplate as any)?.utm_medium || "",
      utm_campaign: (group?.utmTemplate as any)?.utm_campaign || "",
      utm_term: (group?.utmTemplate as any)?.utm_term || "",
      utm_content: (group?.utmTemplate as any)?.utm_content || "",
      ref: (group?.utmTemplate as any)?.ref || "",
    },
  });

  // Reset form values when group data becomes available
  useEffect(() => {
    if (group) {
      reset({
        utmTemplateId: group.utmTemplate?.id || null,
        utm_source: group.utmTemplate?.utm_source || "",
        utm_medium: group.utmTemplate?.utm_medium || "",
        utm_campaign: group.utmTemplate?.utm_campaign || "",
        utm_term: group.utmTemplate?.utm_term || "",
        utm_content: group.utmTemplate?.utm_content || "",
        ref: group.utmTemplate?.ref || "",
      });
    }
  }, [group, reset]);

  const onSubmit = async (data: FormData) => {
    if (!group || !workspaceId) return;

    const {
      utmTemplateId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
    } = data;

    setIsUpdatingTemplate(true);

    // Check if we have UTM parameters to save
    const hasUtmParams =
      utm_source ||
      utm_medium ||
      utm_campaign ||
      utm_term ||
      utm_content ||
      ref;

    let finalTemplateId = utmTemplateId;

    if (hasUtmParams) {
      // If we have an existing template ID, update it
      if (utmTemplateId) {
        const updateResponse = await fetch(
          `/api/utm/${utmTemplateId}?workspaceId=${workspaceId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              utm_source,
              utm_medium,
              utm_campaign,
              utm_term,
              utm_content,
              ref,
            }),
          },
        );

        if (!updateResponse.ok) {
          const { error } = await updateResponse.json();
          toast.error(error.message || "Failed to update UTM template");
          setIsUpdatingTemplate(false);
          return;
        }

        finalTemplateId = utmTemplateId;
      } else {
        // Create a new template
        const createResponse = await fetch(
          `/api/utm?workspaceId=${workspaceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${group.name} UTM Template`,
              utm_source,
              utm_medium,
              utm_campaign,
              utm_term,
              utm_content,
              ref,
            }),
          },
        );

        if (!createResponse.ok) {
          const { error } = await createResponse.json();
          toast.error(error.message || "Failed to create UTM template");
          setIsUpdatingTemplate(false);
          return;
        }

        const newTemplate = await createResponse.json();
        finalTemplateId = newTemplate.id;

        // Update the group with the template ID
        await updateGroup(`/api/groups/${group.id}`, {
          method: "PATCH",
          body: {
            utmTemplateId: finalTemplateId,
          },
          onSuccess: async () => {
            await mutatePrefix("/api/groups");
            await mutatePrefix("/api/utm");
            toast.success("UTM settings saved successfully!");
          },
        });
      }
    }

    setIsUpdatingTemplate(false);
  };

  const currentValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex min-h-80 flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        <SettingsRow
          heading="UTM Parameters"
          description="Configure UTM tracking parameters for all links in this group"
        >
          <UTMBuilder
            values={{
              utm_source: currentValues.utm_source || "",
              utm_medium: currentValues.utm_medium || "",
              utm_campaign: currentValues.utm_campaign || "",
              utm_term: currentValues.utm_term || "",
              utm_content: currentValues.utm_content || "",
              ref: currentValues.ref || "",
            }}
            onChange={(key, value) => {
              setValue(key, value, { shouldDirty: true });
            }}
          />
        </SettingsRow>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
          <Button
            text="Save changes"
            className="h-8 w-fit"
            loading={isSubmitting || isUpdatingTemplate}
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

function SettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{
  heading: string;
  description: string;
}>) {
  return (
    <div className="grid grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-content-emphasis text-base font-semibold leading-none">
          {heading}
        </h3>
        <p className="text-content-subtle text-sm">{description}</p>
      </div>

      <div>{children}</div>
    </div>
  );
}
