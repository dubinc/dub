"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateProps } from "@/lib/types";
import { AnimatedSizeContainer, Button, Popover, Xmark } from "@dub/ui";
import {
  Book2,
  Download,
  LoadingSpinner,
  SquareLayoutGrid6,
  useMediaQuery,
} from "@dub/ui/src";
import { fetcher, getParamsFromURL, timeAgo } from "@dub/utils";
import { ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

export function UTMTemplatesButton({
  onLoad,
}: {
  onLoad: (params: Record<string, string>) => void;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading } = useSWR<UtmTemplateProps[]>(
    workspaceId && `/api/utm-templates?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const [openPopover, setOpenPopover] = useState(false);
  const [state, setState] = useState<"default" | "load" | "save">("default");
  useEffect(() => {
    if (!openPopover) setState("default");
  }, [openPopover]);

  return (
    <Popover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      side="top"
      align="start"
      onWheel={(e) => {
        // Allows scrolling to work when the popover's in a modal
        e.stopPropagation();
      }}
      content={
        <AnimatedSizeContainer width={!isMobile} height>
          {data ? (
            <div className="text-sm">
              {state === "default" && (
                <div className="grid p-1">
                  {data.length > 0 && (
                    <button
                      onClick={() => setState("load")}
                      className="flex w-full items-center gap-2 rounded-md p-2 text-gray-700 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-500 active:bg-gray-200"
                    >
                      <Download className="size-4 text-gray-900" />
                      Load template
                    </button>
                  )}
                  <button
                    onClick={() => setState("save")}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-gray-700 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-500 active:bg-gray-200"
                  >
                    <Book2 className="size-4 text-gray-900" />
                    Save template
                  </button>
                </div>
              )}
              {state === "save" && (
                <div className="max-w-64 p-2">
                  <SaveUTMTemplateForm
                    onSuccess={() => setOpenPopover(false)}
                  />
                </div>
              )}
              {state === "load" && (
                <div className="max-w-64">
                  <UTMTemplateList
                    data={data}
                    onLoad={(params) => {
                      setOpenPopover(false);
                      onLoad(params);
                    }}
                    onDelete={() => setOpenPopover(false)}
                  />
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex w-full items-center justify-center py-4 md:w-32">
              <LoadingSpinner className="size-4" />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center p-2 text-center text-xs text-gray-500 md:w-32">
              Failed to load templates
            </div>
          )}
        </AnimatedSizeContainer>
      }
    >
      <Button
        type="button"
        variant="secondary"
        className="h-10 w-fit px-3"
        textWrapperClassName="flex items-center justify-start"
        text={
          <>
            Templates
            <ChevronUp
              className={`ml-1 size-4 shrink-0 text-gray-400 transition-transform duration-75 group-data-[state=open]:rotate-180`}
            />
          </>
        }
      />
    </Popover>
  );
}

function SaveUTMTemplateForm({ onSuccess }: { onSuccess: () => void }) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const { getValues } = useFormContext();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Manual name input autofocus to prevent scroll (which screws up the AnimatedSizeContainer)
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isMobile && inputRef.current)
      inputRef.current.focus({ preventScroll: true });
  }, [isMobile]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaving(true);
        try {
          const res = await fetch(
            `/api/utm-templates?workspaceId=${workspaceId}`,
            {
              method: "POST",
              body: JSON.stringify({
                name,
                ...getParamsFromURL(getValues("url")),
              }),
            },
          );
          if (!res.ok) throw new Error("UTM template save request failed");

          mutate(`/api/utm-templates?workspaceId=${workspaceId}`);
          toast.success("Template saved successfully");
          onSuccess();
        } catch (e) {
          console.error(e);
          toast.error("Failed to save UTM template");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          className="h-9 min-w-0 grow rounded-md border border-gray-300 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          text="Save"
          className="h-9 w-fit"
          onClick={() => {}}
          disabled={!name}
          loading={saving}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Your saved template will be available to all users in this workspace.
      </p>
    </form>
  );
}

function UTMTemplateList({
  data,
  onLoad,
  onDelete,
}: {
  data: UtmTemplateProps[];
  onLoad: (params: Record<string, string>) => void;
  onDelete: () => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { setValue } = useFormContext();

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(
        `/api/utm-templates/${id}?workspaceId=${workspaceId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("UTM template delete failed");

      mutate(`/api/utm-templates?workspaceId=${workspaceId}`);
      toast.success("Template deleted successfully");
      onDelete();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete template");
    }
  };

  return data.length ? (
    <div className="scrollbar-hide grid max-h-64 overflow-y-auto p-1 md:min-w-48">
      <span className="block pb-2 pl-2.5 pt-2 text-xs font-medium text-gray-500">
        Templates
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
          onDelete={async () => await handleDelete(template.id)}
        />
      ))}
    </div>
  ) : (
    <div className="flex items-center justify-center p-3 text-center text-xs text-gray-500">
      No templates found
    </div>
  );
}

function UTMTemplateOption({
  template,
  onClick,
  onDelete,
}: {
  template: UtmTemplateProps;
  onClick: () => void;
  onDelete: () => Promise<void>;
}) {
  const time = useMemo(
    () => timeAgo(new Date(template.updatedAt)),
    [template.updatedAt],
  );

  const [deleting, setDeleting] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-gray-700 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-500 active:bg-gray-200 group-hover:bg-gray-100"
      >
        <span className="flex items-center gap-1.5">
          <SquareLayoutGrid6 className="text-gray-500" />
          {template.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{time}</span>
          <div className="size-[1.375rem]"></div>
        </div>
      </button>
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          if (!window.confirm("Are you sure you want to delete this template?"))
            return;

          setDeleting(true);
          await onDelete();
          setDeleting(false);
        }}
        className="absolute right-1.5 top-2 rounded-md p-1 text-gray-400 outline-none transition-colors hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-gray-500"
        title="Delete template"
      >
        {deleting ? (
          <LoadingSpinner className="size-3.5" />
        ) : (
          <Xmark className="size-3.5" />
        )}
      </button>
    </div>
  );
}
