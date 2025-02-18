"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  ButtonTooltip,
  Popover,
  useMediaQuery,
} from "@dub/ui";
import { DiamondTurnRight, LoadingSpinner, Note } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";

export function UTMTemplatesButton({
  onLoad,
}: {
  onLoad: (params: Record<string, string>) => void;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading } = useSWR<UtmTemplateProps[]>(
    workspaceId && `/api/utm?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const [openPopover, setOpenPopover] = useState(false);

  return data && data.length > 0 ? (
    <Popover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      side="bottom"
      align="start"
      onWheel={(e) => {
        // Allows scrolling to work when the popover's in a modal
        e.stopPropagation();
      }}
      content={
        <AnimatedSizeContainer width={!isMobile} height>
          {data ? (
            <div className="text-sm">
              <div className="max-w-64">
                <UTMTemplateList
                  data={data}
                  onLoad={(params) => {
                    setOpenPopover(false);
                    onLoad(params);
                  }}
                />
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex w-full items-center justify-center py-4 md:w-32">
              <LoadingSpinner className="size-4" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center p-2 text-center text-xs text-neutral-500 md:w-32">
              Failed to load templates
            </div>
          )}
        </AnimatedSizeContainer>
      }
    >
      <div>
        <ButtonTooltip
          tabIndex={-1}
          tooltipProps={{
            content: "Load a UTM template",
          }}
          className="animate-fade-in size-6"
        >
          <DiamondTurnRight className="size-4" />
        </ButtonTooltip>
      </div>
    </Popover>
  ) : null;
}

function UTMTemplateList({
  data,
  onLoad,
}: {
  data: UtmTemplateProps[];
  onLoad: (params: Record<string, string>) => void;
}) {
  const { setValue } = useFormContext();

  return data.length ? (
    <div className="scrollbar-hide grid max-h-64 overflow-y-auto p-1 md:min-w-48">
      <span className="block pb-2 pl-2.5 pt-2 text-xs font-medium text-neutral-500">
        UTM Templates
      </span>
      {data.map((template) => (
        <UTMTemplateOption
          key={template.id}
          template={template}
          onClick={() => {
            const paramEntries = Object.entries(template)
              .filter(([key]) => key === "ref" || key.startsWith("utm_"))
              .map(([key, value]) => [key, (value || "").toString()]);

            paramEntries.forEach(([key, value]) =>
              setValue(key, value, { shouldDirty: true }),
            );

            onLoad(Object.fromEntries(paramEntries));
          }}
        />
      ))}
    </div>
  ) : (
    <div className="flex items-center justify-center p-3 text-center text-xs text-neutral-500">
      No templates found
    </div>
  );
}

function UTMTemplateOption({
  template,
  onClick,
}: {
  template: UtmTemplateProps;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-neutral-700 outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-500 active:bg-neutral-200 group-hover:bg-neutral-100"
      >
        <span className="flex items-center gap-2">
          <Note className="size-4 text-neutral-500" />
          {template.name}
        </span>
      </button>
    </div>
  );
}
