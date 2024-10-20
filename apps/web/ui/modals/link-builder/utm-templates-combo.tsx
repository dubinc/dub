"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateProps } from "@/lib/types";
import { Button, Combobox, Tooltip } from "@dub/ui";
import { DiamondTurnRight } from "@dub/ui/src/icons";
import { UTM_PARAMETERS } from "@dub/ui/src/utm-builder";
import { fetcher, getParamsFromURL } from "@dub/utils";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

export function UTMTemplatesCombo({
  onLoad,
  disabledTooltip,
}: {
  onLoad: (params: Record<string, string>) => void;
  disabledTooltip?: string;
}) {
  const { id: workspaceId } = useWorkspace();

  const { setValue, getValues } = useFormContext();

  const { data } = useSWR<UtmTemplateProps[]>(
    workspaceId && `/api/utm?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <Combobox
      selected={null}
      setSelected={(option) => {
        if (!option) return;
        const template = data?.find((template) => template.id === option.value);
        if (!template) return;

        const paramEntries = Object.entries(template)
          .filter(([key]) => key === "ref" || key.startsWith("utm_"))
          .map(([key, value]) => [key, (value || "").toString()]);

        paramEntries.forEach(([key, value]) =>
          setValue(key, value, { shouldDirty: true }),
        );

        onLoad(Object.fromEntries(paramEntries));
      }}
      options={data?.map((template) => ({
        label: template.name,
        value: template.id,
      }))}
      optionRight={({ value }) => {
        const template = data?.find((template) => template.id === value);
        if (!template) return null;

        const includedParams = UTM_PARAMETERS.filter(
          ({ key }) => template[key],
        );

        return (
          <Tooltip
            content={
              <div className="grid max-w-[225px] grid-cols-[1fr,minmax(0,min-content)] gap-x-2 gap-y-1 whitespace-nowrap p-2 text-sm sm:min-w-[150px]">
                {includedParams.map(({ key, label, icon: Icon }) => (
                  <Fragment key={key}>
                    <span className="font-medium text-gray-600">{label}</span>
                    <span className="truncate text-gray-500">
                      {template[key]}
                    </span>
                  </Fragment>
                ))}
              </div>
            }
          >
            <div className="ml-4 flex shrink-0 items-center gap-1 text-gray-500">
              {includedParams.map(({ icon: Icon }) => (
                <Icon className="size-3.5" />
              ))}
            </div>
          </Tooltip>
        );
      }}
      placeholder="Templates"
      searchPlaceholder="Load or save a template..."
      emptyState={<NoUTMTemplatesFound />}
      icon={DiamondTurnRight}
      createLabel={(search) => `Save new template: "${search}"`}
      onCreate={async (search) => {
        try {
          const res = await fetch(`/api/utm?workspaceId=${workspaceId}`, {
            method: "POST",
            body: JSON.stringify({
              name: search,
              ...getParamsFromURL(getValues("url")),
            }),
          });
          if (!res.ok) {
            const { error } = await res.json();
            toast.error(error.message);
            return false;
          }

          mutate(`/api/utm?workspaceId=${workspaceId}`);
          toast.success("Template saved successfully");
          return true;
        } catch (e) {
          console.error(e);
          toast.error("Failed to save UTM template");
        }

        return false;
      }}
      buttonProps={{ className: "w-fit px-2", disabledTooltip }}
      inputClassName="md:min-w-[200px]"
      optionClassName="md:min-w-[250px] md:max-w-[350px]"
      caret
    />
  );
}

const NoUTMTemplatesFound = () => {
  const router = useRouter();
  const { slug } = useWorkspace();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-2 py-4 text-center text-sm">
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <DiamondTurnRight className="size-6 text-gray-700" />
      </div>
      <p className="mt-2 font-medium text-gray-950">No UTM templates found</p>
      <p className="mx-auto mt-1 w-full max-w-[180px] text-gray-700">
        Add a UTM template to easily create links with the same UTM parameters.
      </p>
      <div>
        <Button
          className="mt-1 h-8"
          onClick={() => router.push(`/${slug}/settings/library/utm`)}
          text="Add UTM template"
        />
      </div>
    </div>
  );
};
