"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateProps } from "@/lib/types";
import { Combobox } from "@dub/ui";
import { Note } from "@dub/ui/src/icons";
import { fetcher, getParamsFromURL } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

export function UTMTemplatesCombo({
  onLoad,
}: {
  onLoad: (params: Record<string, string>) => void;
}) {
  const { id: workspaceId } = useWorkspace();

  const { setValue, getValues } = useFormContext();

  const { data } = useSWR<UtmTemplateProps[]>(
    workspaceId && `/api/utm-templates?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return data && data.length > 0 ? (
    <Combobox
      selected={null}
      setSelected={(option) => {
        if (!option) return;
        const template = data.find((template) => template.id === option.value);
        if (!template) return;

        const paramEntries = Object.entries(template)
          .filter(([key]) => key === "ref" || key.startsWith("utm_"))
          .map(([key, value]) => [key, (value || "").toString()]);

        paramEntries.forEach(([key, value]) =>
          setValue(key, value, { shouldDirty: true }),
        );

        onLoad(Object.fromEntries(paramEntries));
      }}
      options={data.map((template) => ({
        label: template.name,
        value: template.id,
      }))}
      placeholder="Templates"
      searchPlaceholder="Load or save a template..."
      icon={Note}
      createLabel={(search) => `Save new template: "${search}"`}
      onCreate={async (search) => {
        try {
          const res = await fetch(
            `/api/utm-templates?workspaceId=${workspaceId}`,
            {
              method: "POST",
              body: JSON.stringify({
                name: search,
                ...getParamsFromURL(getValues("url")),
              }),
            },
          );
          if (!res.ok) {
            const { error } = await res.json();
            toast.error(error.message);
            return false;
          }

          mutate(`/api/utm-templates?workspaceId=${workspaceId}`);
          toast.success("Template saved successfully");
          return true;
        } catch (e) {
          console.error(e);
          toast.error("Failed to save UTM template");
        }

        return false;
      }}
      buttonProps={{ className: "w-fit px-2" }}
      optionClassName="sm:min-w-[200px] sm:max-w-[350px] animate-fade-in"
      caret
    />
  ) : null;
}
