"use client";

import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { Badge, Button, UTMBuilder } from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn, deepEqual } from "@dub/utils";
import { PropsWithChildren, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormData = {
  utmTemplateId?: string | null;
  linkStructure?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  ref?: string | null;
};

export function GroupLinkSettings() {
  const { group, loading: isLoadingGroup } = useGroup();

  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
      <div className="px-6 py-6">
        <h3 className="text-content-emphasis text-lg font-semibold leading-7">
          Link settings
        </h3>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Configure link structure and UTM parameters
        </p>
      </div>

      {group ? (
        <GroupLinkSettingsForm group={group} />
      ) : isLoadingGroup ? (
        <div className="flex h-[4.5rem] animate-pulse rounded-b-lg border-t border-neutral-200 bg-neutral-100" />
      ) : (
        <div className="text-content-subtle h-20 text-center">
          Failed to load link settings
        </div>
      )}
    </div>
  );
}

function GroupLinkSettingsForm({ group }: { group: GroupProps }) {
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();

  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const { makeRequest: updateGroup, isSubmitting: isUpdatingGroup } =
    useApiMutation();

  const { handleSubmit, watch, setValue, register } = useForm<FormData>({
    mode: "onBlur",
    values: {
      utmTemplateId: group?.utmTemplate?.id || null,
      utm_source: group?.utmTemplate?.utm_source || null,
      utm_medium: group?.utmTemplate?.utm_medium || null,
      utm_campaign: group?.utmTemplate?.utm_campaign || null,
      utm_term: group?.utmTemplate?.utm_term || null,
      utm_content: group?.utmTemplate?.utm_content || null,
      ref: group?.utmTemplate?.ref || null,
      linkStructure: group?.linkStructure || null,
    },
  });

  const currentValues = watch();

  const onSubmit = async (data: FormData) => {
    if (!group || !workspaceId) return;

    let {
      utmTemplateId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
      linkStructure,
    } = data;

    const utmFieldsChanged = !deepEqual(
      {
        utmTemplateId,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        ref,
      },
      {
        utm_source: currentValues.utm_source,
        utm_medium: currentValues.utm_medium,
        utm_campaign: currentValues.utm_campaign,
        utm_term: currentValues.utm_term,
        utm_content: currentValues.utm_content,
        ref: currentValues.ref,
      },
    );

    // Create a new UTM template if one doesn't exist
    if (utmFieldsChanged) {
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
        body: JSON.stringify({
          name: group.name,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          ref,
        }),
      });

      setIsUpdatingTemplate(false);

      if (!response.ok) {
        const { error } = await response.json();
        toast.error(error.message);
        return;
      }

      if (!utmTemplateId) {
        const data = await response.json();
        utmTemplateId = data.id;
      }

      await mutatePrefix("/api/utm");
    }

    // Update the group with UTM template and link structure
    const shouldUpdateGroup =
      linkStructure !== group.linkStructure ||
      utmTemplateId !== group.utmTemplate?.id;

    if (shouldUpdateGroup) {
      await updateGroup(`/api/groups/${group.id}`, {
        method: "PATCH",
        body: {
          linkStructure,
          utmTemplateId,
        },
        onSuccess: async () => {
          await mutatePrefix(["/api/groups", "/api/utm"]);
          toast.success("Settings saved successfully!");
        },
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col divide-y divide-neutral-200"
    >
      <SettingsRow
        heading="Link structure"
        description="How your partner links are displayed"
      >
        <div className="grid grid-cols-1 gap-3">
          {program &&
            getLinkStructureOptions({
              domain: program.domain,
              url: program.url,
            }).map((type) => {
              const isSelected = type.id === currentValues.linkStructure;

              return (
                <label
                  key={type.id}
                  className={cn(
                    "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                    "transition-all duration-150 hover:bg-neutral-50",
                    isSelected &&
                      "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  )}
                >
                  <input
                    type="radio"
                    value={type.id}
                    className="hidden"
                    {...register("linkStructure")}
                  />

                  <div className="flex grow flex-col text-sm">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-neutral-600">{type.example}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {type.recommended && (
                      <Badge variant="blueGradient">Recommended</Badge>
                    )}
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </div>
                </label>
              );
            })}
        </div>
      </SettingsRow>

      <SettingsRow
        heading="UTM parameters"
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
          // onClick={() => setShowConfirmModal(true)}
        />
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
