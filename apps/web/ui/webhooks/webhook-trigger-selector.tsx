"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  LINK_CLICK_WEBHOOK_TRIGGER,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
} from "@/lib/webhook/constants";
import type { WebhookTrigger } from "@/lib/webhook/types";
import { Checkbox, RadioGroup, RadioGroupItem } from "@dub/ui";
import { arrayEqual, cn, fetcher } from "@dub/utils";
import { LinkScope } from "@prisma/client";
import { useEffect } from "react";
import useSWR from "swr";
import { FoldersSelector } from "./folder-selector";
import { LinksSelector } from "./link-selector";

const CLICK_WEBHOOK_LINK_TARGET_OPTIONS = [
  {
    value: "workspace",
    label: "All links",
    description: "Trigger webhooks for all links in your workspace",
  },
  {
    value: "folders",
    label: "Include specific folders (Recommended)",
    description: "Trigger webhooks for all links from selected folders",
  },
  {
    value: "links",
    label: "Include specific links",
    description: "Trigger webhooks for the links you explicitly select",
  },
] as const satisfies ReadonlyArray<{
  value: LinkScope;
  label: string;
  description: string;
}>;

export type WebhookTriggerSelectorValue = {
  triggers: WebhookTrigger[];
  linkScope: LinkScope;
  linkIds: string[];
  folderIds: string[];
};

export function isWebhookTriggerSelectionInvalid(
  value: WebhookTriggerSelectorValue,
): boolean {
  const hasLinkClicked = value.triggers.includes(LINK_CLICK_WEBHOOK_TRIGGER);

  if (!hasLinkClicked) {
    return false;
  }

  return (
    (value.linkScope === "links" && value.linkIds.length === 0) ||
    (value.linkScope === "folders" && value.folderIds.length === 0)
  );
}

export function WebhookTriggerSelector({
  value,
  onChange,
  availableTriggers,
  disabled,
  webhookId,
  savedLinkScope,
}: {
  value: WebhookTriggerSelectorValue;
  onChange: (value: WebhookTriggerSelectorValue) => void;
  availableTriggers: WebhookTrigger[];
  disabled?: boolean;
  webhookId?: string;
  savedLinkScope?: LinkScope | null;
}) {
  const { id: workspaceId } = useWorkspace();

  const { triggers, linkScope, linkIds, folderIds } = value;
  const hasLinkClicked = triggers.includes(LINK_CLICK_WEBHOOK_TRIGGER);

  const { data: fetchedLinkIds } = useSWR<string[]>(
    webhookId && savedLinkScope === "links"
      ? `/api/webhooks/${webhookId}/links?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const { data: fetchedFolderIds } = useSWR<string[]>(
    webhookId && savedLinkScope === "folders"
      ? `/api/webhooks/${webhookId}/folders?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  useEffect(() => {
    if (linkScope === "links" && fetchedLinkIds) {
      if (!arrayEqual(linkIds, fetchedLinkIds)) {
        onChange({
          triggers,
          linkScope,
          linkIds: fetchedLinkIds,
          folderIds,
        });
      }
    } else if (linkScope !== "links" && linkIds.length > 0) {
      onChange({
        triggers,
        linkScope,
        linkIds: [],
        folderIds,
      });
    }
    // Only sync from server when linkScope or fetched ids change — not on manual selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkScope, fetchedLinkIds]);

  useEffect(() => {
    if (linkScope === "folders" && fetchedFolderIds) {
      if (!arrayEqual(folderIds, fetchedFolderIds)) {
        onChange({
          triggers,
          linkScope,
          linkIds,
          folderIds: fetchedFolderIds,
        });
      }
    } else if (linkScope !== "folders" && folderIds.length > 0) {
      onChange({
        triggers,
        linkScope,
        linkIds,
        folderIds: [],
      });
    }
    // Only sync from server when linkScope or fetched ids change — not on manual selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkScope, fetchedFolderIds]);

  const toggleTrigger = (
    trigger: WebhookTrigger,
    checked: boolean | "indeterminate",
  ) => {
    if (checked === "indeterminate") {
      return;
    }

    onChange({
      ...value,
      triggers: checked
        ? [...triggers, trigger]
        : triggers.filter((t) => t !== trigger),
    });
  };

  const handleLinkScopeChange = (nextLinkScope: LinkScope) => {
    onChange({
      ...value,
      linkScope: nextLinkScope,
      linkIds: nextLinkScope === "links" ? linkIds : [],
      folderIds: nextLinkScope === "folders" ? folderIds : [],
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {availableTriggers.map((trigger) => (
        <div key={trigger}>
          <div className="group flex gap-2">
            <Checkbox
              value={trigger}
              id={trigger}
              checked={triggers.includes(trigger)}
              disabled={disabled}
              onCheckedChange={(checked) => toggleTrigger(trigger, checked)}
            />
            <label
              htmlFor={trigger}
              className="flex select-none items-center gap-2 text-sm text-neutral-600 group-hover:text-neutral-800"
            >
              {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
            </label>
          </div>

          {trigger === LINK_CLICK_WEBHOOK_TRIGGER && hasLinkClicked ? (
            <div className="ml-6 mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <RadioGroup
                value={linkScope}
                onValueChange={(nextValue) =>
                  handleLinkScopeChange(nextValue as LinkScope)
                }
                className="flex flex-col gap-2"
                disabled={disabled}
              >
                {CLICK_WEBHOOK_LINK_TARGET_OPTIONS.map((option) => {
                  const isSelected = linkScope === option.value;

                  return (
                    <div key={option.value}>
                      <label
                        className={cn(
                          "relative flex w-full cursor-pointer items-start gap-3 rounded-md border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50",
                          "transition-all duration-150",
                          isSelected &&
                            "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`linkScope-${option.value}`}
                          className="mt-0.5"
                          disabled={disabled}
                        />
                        <div className="flex grow flex-col text-sm">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-neutral-500">
                            {option.description}
                          </span>
                        </div>
                      </label>

                      {isSelected && option.value === "folders" ? (
                        <div className="mt-3 pl-7">
                          <h3 className="text-sm font-medium text-neutral-900">
                            Included folders
                          </h3>
                          <div className="mt-2">
                            <FoldersSelector
                              selectedFolderIds={folderIds}
                              setSelectedFolderIds={(ids) =>
                                onChange({ ...value, folderIds: ids })
                              }
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      ) : null}

                      {isSelected && option.value === "links" ? (
                        <div className="mt-3 pl-7">
                          <h3 className="text-sm font-medium text-neutral-900">
                            Included links
                          </h3>
                          <div className="mt-2">
                            <LinksSelector
                              selectedLinkIds={linkIds}
                              setSelectedLinkIds={(ids) =>
                                onChange({ ...value, linkIds: ids })
                              }
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
