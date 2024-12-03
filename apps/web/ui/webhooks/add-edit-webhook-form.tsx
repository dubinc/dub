"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps, NewWebhook, WebhookProps } from "@/lib/types";
import {
  LINK_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import {
  Button,
  Checkbox,
  Combobox,
  CopyButton,
  InfoTooltip,
  LinkLogo,
} from "@dub/ui";
import { cn, getApexDomain, linkConstructor, truncate } from "@dub/utils";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";

const defaultValues: NewWebhook = {
  name: "",
  url: "",
  secret: "",
  triggers: [],
  linkIds: [],
};

export default function AddEditWebhookForm({
  webhook,
  newSecret,
}: {
  webhook: WebhookProps | null;
  newSecret?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { slug: workspaceSlug, id: workspaceId, flags, role } = useWorkspace();

  if (!flags?.webhooks) {
    redirect(`/${workspaceSlug}`);
  }

  const [data, setData] = useState<NewWebhook | WebhookProps>(
    webhook || {
      ...defaultValues,
      ...(newSecret && { secret: newSecret }),
    },
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (webhook) {
      return {
        method: "PATCH",
        url: `/api/webhooks/${webhook.id}?workspaceId=${workspaceId}`,
        successMessage: "Webhook updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/webhooks?workspaceId=${workspaceId}`,
        successMessage: "Webhook created!",
      };
    }
  }, [webhook]);

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    setSaving(false);
    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    if (endpoint.method === "POST") {
      mutate(`/api/webhooks?workspaceId=${workspaceId}`);
      router.push(`/${workspaceSlug}/settings/webhooks`);
    } else {
      mutate(`/api/webhooks/${result.id}?workspaceId=${workspaceId}`, result);
    }

    toast.success(endpoint.successMessage);
  };

  const { name, url, secret, triggers, linkIds = [] } = data;
  const buttonDisabled = !name || !url || !triggers.length || saving;
  const canManageWebhook = !permissionsError;
  const enableLinkSelection = LINK_LEVEL_WEBHOOK_TRIGGERS.some((trigger) =>
    triggers.includes(trigger),
  );

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageWebhook,
                },
              )}
              required
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="Webhook name"
              disabled={!canManageWebhook}
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">URL</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageWebhook,
                },
              )}
              required
              value={url}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              autoComplete="off"
              placeholder="Webhook URL"
              disabled={!canManageWebhook}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Signing secret
            </h2>
            <InfoTooltip content="A secret token used to sign the webhook payload." />
          </label>
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1">
            <p className="text-nowrap font-mono text-sm text-gray-500">
              {secret}
            </p>
            <div className="flex flex-col gap-2">
              <CopyButton value={secret!} className="rounded-md" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <label htmlFor="triggers" className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-gray-900">
              Workspace level events
            </h2>
            <span className="text-xs text-gray-500">
              These events are triggered at the workspace level.
            </span>
          </label>
          <div className="mt-3 flex flex-col gap-2">
            {WORKSPACE_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
              <div key={trigger} className="group flex gap-2">
                <Checkbox
                  value={trigger}
                  id={trigger}
                  checked={triggers.includes(trigger)}
                  disabled={!canManageWebhook}
                  onCheckedChange={(checked) => {
                    setData({
                      ...data,
                      triggers: checked
                        ? [...triggers, trigger]
                        : triggers.filter((t) => t !== trigger),
                    });
                  }}
                />
                <label
                  htmlFor={trigger}
                  className="select-none text-sm text-gray-600 group-hover:text-gray-800"
                >
                  {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <label htmlFor="triggers" className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-gray-900">
              Link level events{" "}
              <span className="rounded bg-yellow-100 px-1 py-0.5 text-xs font-medium text-yellow-800">
                High traffic
              </span>
            </h2>
            <span className="text-xs text-gray-500">
              These events are triggered at the link level.
            </span>
          </label>
          <div className="mt-3 flex flex-col gap-2">
            {LINK_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
              <div key={trigger} className="group flex gap-2">
                <Checkbox
                  value={trigger}
                  id={trigger}
                  checked={triggers.includes(trigger)}
                  disabled={!canManageWebhook}
                  onCheckedChange={(checked) => {
                    setData({
                      ...data,
                      triggers: checked
                        ? [...triggers, trigger]
                        : triggers.filter((t) => t !== trigger),
                    });
                  }}
                />
                <label
                  htmlFor={trigger}
                  className="flex select-none items-center gap-2 text-sm text-gray-600 group-hover:text-gray-800"
                >
                  {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                </label>
              </div>
            ))}
          </div>

          {enableLinkSelection || linkIds.length ? (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-gray-900">
                Choose links we should send events for
              </h2>
              <div className="mt-3">
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
            </div>
          ) : null}
        </div>

        <Button
          text={webhook ? "Save changes" : "Create webhook"}
          disabled={buttonDisabled}
          loading={saving}
          type="submit"
          {...(permissionsError && {
            disabledTooltip: permissionsError,
          })}
        />
      </form>
    </>
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
