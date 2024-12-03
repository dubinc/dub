"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps, WebhookProps } from "@/lib/types";
import { Link } from "@/ui/shared/icons";
import { Button, Combobox, LinkLogo } from "@dub/ui";
import {
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { useDebounce } from "use-debounce";
import { SegmentSettingsProps } from "./types";

export default function WebhookLinkSelector({
  credentials,
}: {
  credentials: SegmentSettingsProps["credentials"];
}) {
  const webhookId = credentials?.webhookId;

  const [saving, setSaving] = useState(false);
  const { id: workspaceId, role } = useWorkspace();
  const [data, setData] = useState<Pick<WebhookProps, "linkIds">>();

  // if (!flags?.webhooks) {
  //   redirect(`/${workspaceSlug}`);
  // }

  const { data: webhook } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);

    const response = await fetch(
      `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    setSaving(false);

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    mutate(`/api/webhooks/${webhookId}?workspaceId=${workspaceId}`, result);
    toast.success("Webhook preferences saved!");
  };

  const canManageWebhook = !permissionsError;
  const linkIds = data?.linkIds || [];

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
        <Link className="size-4" />
        <p className="text-sm font-medium text-gray-700">
          Configure links we should send events for
        </p>
      </div>

      <div className="p-4">
        <p className="text-sm leading-normal text-gray-600">
          Choose the links from the list below to track click events. We'll send
          a <strong>click event</strong> to Segment each time a user clicks on
          one of the links you select.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-col items-center gap-2 sm:flex-row"
        >
          <div className="w-full flex-grow">
            <LinksSelector
              selectedLinkIds={linkIds}
              setSelectedLinkIds={(ids) =>
                setData({
                  ...data,
                  linkIds: ids,
                })
              }
              disabled={!canManageWebhook}
            />
          </div>

          <Button
            text="Save changes"
            loading={saving}
            type="submit"
            className="w-full sm:w-fit"
            {...(permissionsError && {
              disabledTooltip: permissionsError,
            })}
            disabled={!canManageWebhook}
          />
        </form>
      </div>
    </div>
  );
}

const getLinkOption = (link: LinkProps) => ({
  value: link.id,
  label: linkConstructor({ ...link, pretty: true }),
  icon: (
    <LinkLogo
      apexDomain={getApexDomain(link.url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ),
  meta: {
    url: link.url,
  },
});

function LinksSelector({
  selectedLinkIds,
  setSelectedLinkIds,
  disabled,
}: {
  selectedLinkIds: string[];
  setSelectedLinkIds: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { links } = useLinks(
    {
      search: debouncedSearch,
    },
    {
      keepPreviousData: false,
    },
  );

  const { links: selectedLinks } = useLinks({
    linkIds: selectedLinkIds,
  });

  const options = useMemo(
    () => links?.map((link) => getLinkOption(link)),
    [links],
  );

  const selectedOptions = useMemo(
    () =>
      selectedLinkIds
        .map((id) =>
          [...(links || []), ...(selectedLinks || [])].find((l) => l.id === id),
        )
        .filter(Boolean)
        .map((l) => getLinkOption(l as LinkProps)),
    [selectedLinkIds, links, selectedLinks],
  );

  return (
    <Combobox
      multiple
      caret
      matchTriggerWidth
      side="top" // Since this control is near the bottom of the page, prefer top to avoid jumping
      options={options}
      selected={selectedOptions ?? []}
      setSelected={(selected) => {
        setSelectedLinkIds(selected.map(({ value: id }) => id));
      }}
      shouldFilter={false}
      onSearchChange={setSearch}
      buttonProps={{
        disabled,
        className: cn(
          "h-auto py-1.5 px-2.5 w-full max-w-full text-gray-700 border-gray-300 items-start",
        ),
      }}
    >
      {selectedLinkIds.length === 0 ? (
        <div className="py-0.5">Select links...</div>
      ) : selectedLinks && selectedOptions ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.slice(0, 10).map((option) => (
            <span
              key={option.value}
              className="animate-fade-in flex min-w-0 items-center gap-1 rounded-md bg-gray-100 px-1.5 py-1 text-xs text-gray-600"
            >
              <LinkLogo
                apexDomain={getApexDomain(option.meta.url)}
                className="size-3 shrink-0 sm:size-3"
              />
              <span className="min-w-0 truncate">
                {truncate(option.label, 32)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-gray-200" />
      )}
    </Combobox>
  );
}
