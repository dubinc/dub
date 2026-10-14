"use client";

import { SUBMITTED_LEAD_FORM_REQUIRED_FIELDS } from "@/lib/submitted-leads/constants";
import { updateSubmittedLeadFormAction } from "@/lib/submitted-leads/update-submitted-lead-form-action";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroup from "@/lib/swr/use-group";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps, GroupWithFormDataProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { X } from "@/ui/shared/icons";
import { ScrollFades, useScrollFades } from "@/ui/shared/scroll-fades";
import { Button, LoadingSpinner, Sheet, Switch, Tooltip } from "@dub/ui";
import { Envelope, InputField, Lock, Plus } from "@dub/ui/icons";
import { AnimatePresence, Reorder } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createLeadFormBuilderField,
  LeadFormBuilderField,
  parseLeadFormBuilderFields,
  toLeadFormBuilderField,
} from "./lead-form-builder-fields";
import { LeadFormFieldCard } from "./lead-form-field-card";

type EditLeadFormSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function EditLeadFormSheetContent({ setIsOpen }: EditLeadFormSheetProps) {
  const { groups } = useGroups();

  // Groups share one form for now, so edit the default group's copy
  const { group: defaultGroup } = useGroup<GroupWithFormDataProps>({
    groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Edit submitted lead form
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      {groups && defaultGroup ? (
        <EditLeadFormSheetForm
          groups={groups}
          defaultGroup={defaultGroup}
          setIsOpen={setIsOpen}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

function EditLeadFormSheetForm({
  groups,
  defaultGroup,
  setIsOpen,
}: EditLeadFormSheetProps & {
  groups: GroupProps[];
  defaultGroup: GroupWithFormDataProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const { fades, scrollRef, onScroll } = useScrollFades();

  const initialState = useMemo(
    () => ({
      enabledGroupIds: groups
        .filter(({ submittedLeadsEnabledAt }) => submittedLeadsEnabledAt)
        .map(({ id }) => id),
      fields: [...(defaultGroup.submittedLeadFormData?.fields ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(toLeadFormBuilderField),
    }),
    [groups, defaultGroup],
  );

  const [enabledGroupIds, setEnabledGroupIds] = useState(
    initialState.enabledGroupIds,
  );
  const [fields, setFields] = useState(initialState.fields);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const isDirty =
    JSON.stringify({ enabledGroupIds, fields }) !==
    JSON.stringify(initialState);

  const allGroupsEnabled = groups.every(({ id }) =>
    enabledGroupIds.includes(id),
  );

  const { executeAsync, isPending } = useAction(updateSubmittedLeadFormAction, {
    onSuccess: async () => {
      toast.success("Submitted lead form updated.");
      setIsOpen(false);
      await mutatePrefix("/api/groups");
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to update the lead form.");
    },
  });

  const updateField = (field: LeadFormBuilderField) => {
    setFields((fields) => fields.map((f) => (f.key === field.key ? field : f)));
    if (errorKey === field.key) setErrorKey(null);
  };

  const onSave = async () => {
    if (!workspaceId) return;

    const result = parseLeadFormBuilderFields(fields);

    if (!result.success) {
      setErrorKey(result.key);
      setExpandedKey(result.key);
      toast.error(result.message);
      return;
    }

    await executeAsync({
      workspaceId,
      enabledGroupIds: enabledGroupIds.filter(
        (id) => !initialState.enabledGroupIds.includes(id),
      ),
      disabledGroupIds: initialState.enabledGroupIds.filter(
        (id) => !enabledGroupIds.includes(id),
      ),
      submittedLeadFormData: {
        fields: result.fields,
      },
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pb-8 pt-6">
          <ProgramSheetAccordion
            type="multiple"
            defaultValue={["group-access", "form-fields"]}
            className="space-y-6"
          >
            <ProgramSheetAccordionItem value="group-access">
              <ProgramSheetAccordionTrigger className="py-2.5">
                Group access
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent
                className="py-5"
                animateHeight={false}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="lead-form-all-groups"
                      checked={allGroupsEnabled}
                      fn={(checked: boolean) =>
                        setEnabledGroupIds(
                          checked ? groups.map(({ id }) => id) : [],
                        )
                      }
                    />
                    <label
                      htmlFor="lead-form-all-groups"
                      className="cursor-pointer text-sm font-medium text-neutral-800"
                    >
                      Enable the form for all groups
                    </label>
                  </div>

                  <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div
                      ref={scrollRef}
                      onScroll={onScroll}
                      className="scrollbar-hide max-h-[268px] overflow-y-auto [clip-path:inset(0)]"
                    >
                      <div className="divide-y divide-neutral-200">
                        {groups.map((group) => (
                          <div
                            key={group.id}
                            className="flex h-11 items-center justify-between gap-2 px-4"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <GroupColorCircle group={group} />
                              <span className="truncate text-sm font-medium text-neutral-700">
                                {group.name}
                              </span>
                              {group.slug === DEFAULT_PARTNER_GROUP.slug && (
                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <Switch
                              checked={enabledGroupIds.includes(group.id)}
                              fn={(checked: boolean) =>
                                setEnabledGroupIds((ids) =>
                                  checked
                                    ? [...ids, group.id]
                                    : ids.filter((id) => id !== group.id),
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <ScrollFades fades={fades} />
                  </div>
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>

            <ProgramSheetAccordionItem value="form-fields">
              <ProgramSheetAccordionTrigger className="py-2.5">
                Form fields
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent
                className="py-5"
                animateHeight={false}
              >
                <div className="flex flex-col gap-4">
                  {SUBMITTED_LEAD_FORM_REQUIRED_FIELDS.map((field) => (
                    <RequiredFieldRow
                      key={field.key}
                      label={field.label}
                      isEmail={field.key === "email"}
                    />
                  ))}

                  <Reorder.Group
                    axis="y"
                    values={fields.map(({ key }) => key)}
                    onReorder={(keys) =>
                      setFields((fields) =>
                        keys.map((key) => fields.find((f) => f.key === key)!),
                      )
                    }
                    // The cards add their own bottom padding
                    className="-mb-4 flex flex-col empty:hidden"
                  >
                    <AnimatePresence initial={false}>
                      {fields.map((field, index) => (
                        <LeadFormFieldCard
                          key={field.key}
                          field={field}
                          index={index}
                          expanded={expandedKey === field.key}
                          error={errorKey === field.key}
                          onToggle={() =>
                            setExpandedKey((key) =>
                              key === field.key ? null : field.key,
                            )
                          }
                          onChange={updateField}
                          onRemove={() =>
                            setFields((fields) =>
                              fields.filter((f) => f.key !== field.key),
                            )
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>

                  <Button
                    type="button"
                    variant="primary"
                    text="Add field"
                    icon={<Plus className="size-4" />}
                    className="h-8 rounded-lg"
                    onClick={() => {
                      const field = createLeadFormBuilderField();
                      setFields((fields) => [...fields, field]);
                      setExpandedKey(field.key);
                    }}
                  />
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>
          </ProgramSheetAccordion>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="w-fit"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          />
          <Button
            type="button"
            variant="primary"
            text="Save"
            className="w-fit"
            onClick={onSave}
            loading={isPending}
            disabled={!isDirty}
          />
        </div>
      </div>
    </>
  );
}

function RequiredFieldRow({
  label,
  isEmail,
}: {
  label: string;
  isEmail: boolean;
}) {
  const Icon = isEmail ? Envelope : InputField;

  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] border border-neutral-200 bg-white p-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center text-neutral-800">
          <Icon className="size-3.5" />
        </div>
        <span className="truncate text-sm font-semibold text-neutral-800">
          {label}
        </span>
      </div>
      <Tooltip content="Required fields can't be changed.">
        <div className="flex size-6 shrink-0 items-center justify-center text-neutral-400">
          <Lock className="size-3.5" />
        </div>
      </Tooltip>
    </div>
  );
}

export function EditLeadFormSheet({
  isOpen,
  ...rest
}: EditLeadFormSheetProps & { isOpen: boolean }) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <EditLeadFormSheetContent {...rest} />
    </Sheet>
  );
}

export function useEditLeadFormSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    editLeadFormSheet: (
      <EditLeadFormSheet isOpen={isOpen} setIsOpen={setIsOpen} />
    ),
    setIsOpen,
  };
}
