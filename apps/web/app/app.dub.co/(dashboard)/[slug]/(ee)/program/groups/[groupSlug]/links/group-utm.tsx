"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { UTMTemplateSchema } from "@/lib/zod/schemas/utm";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, UTMBuilder } from "@dub/ui";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = {
  utmTemplateId?: string | null;
} & z.infer<typeof UTMTemplateSchema>;

export function GroupUTM() {
  const { id: workspaceId } = useWorkspace();
  const { group, loading: isLoadingGroup } = useGroup();

  const formRef = useRef<HTMLFormElement>(null);

  const { makeRequest: updateGroup, isSubmitting: isUpdatingGroup } =
    useApiMutation();
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const { confirmModal, setShowConfirmModal } = useConfirmModal({
    title: "Save updated UTM parameters",
    description:
      "All existing and new partner links will automatically be updated with these UTM parameters.",
    confirmText: "Save",
    onConfirm: async () => {
      formRef.current?.requestSubmit();
    },
  });

  const { handleSubmit, watch, setValue, reset } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      utmTemplateId: group?.utmTemplate?.id || null,
      utm_source: group?.utmTemplate?.utm_source || "",
      utm_medium: group?.utmTemplate?.utm_medium || "",
      utm_campaign: group?.utmTemplate?.utm_campaign || "",
      utm_term: group?.utmTemplate?.utm_term || "",
      utm_content: group?.utmTemplate?.utm_content || "",
      ref: group?.utmTemplate?.ref || "",
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

    const hasUtmParams =
      utm_source ||
      utm_medium ||
      utm_campaign ||
      utm_term ||
      utm_content ||
      ref;

    const templateData = {
      name: `${group.name} UTM Template`,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
    };

    setIsUpdatingTemplate(true);

    const endpoint = utmTemplateId
      ? `/api/utm/${utmTemplateId}?workspaceId=${workspaceId}`
      : `/api/utm?workspaceId=${workspaceId}`;

    // Create or update the UTM template
    const response = await fetch(endpoint, {
      method: utmTemplateId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsUpdatingTemplate(false);
      return;
    }

    // Update the group to use the new utmTemplateId
    if (!utmTemplateId) {
      const { id: utmTemplateId } = await response.json();

      await updateGroup(`/api/groups/${group.id}`, {
        method: "PATCH",
        body: {
          utmTemplateId,
        },
        onSuccess: async () => {
          await mutatePrefix(["/api/groups", "/api/utm"]);
          toast.success("UTM settings saved successfully!");
          setIsUpdatingTemplate(false);
        },
      });
    }

    setIsUpdatingTemplate(false);
  };

  const currentValues = watch();

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
      {confirmModal}
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
            loading={isUpdatingGroup || isUpdatingTemplate}
            disabled={isLoadingGroup}
            onClick={() => setShowConfirmModal(true)}
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
