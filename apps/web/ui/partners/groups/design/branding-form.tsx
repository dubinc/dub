"use client";

import { updateGroupBrandingAction } from "@/lib/actions/partners/update-group-branding";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  GroupWithProgramProps,
  ProgramApplicationFormData,
  ProgramLanderData,
  ProgramProps,
} from "@/lib/types";
import LayoutLoader from "@/ui/layout/layout-loader";
import {
  Brush,
  Button,
  MenuItem,
  Popover,
  ToggleGroup,
  useLocalStorage,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { v4 as uuid } from "uuid";
import {
  BrandingContextProvider,
  useBrandingContext,
} from "./branding-context-provider";
import { BrandingSettingsForm } from "./branding-settings-form";
import { ApplicationPreview } from "./previews/application-preview";
import { LanderPreview } from "./previews/lander-preview";

export type BrandingFormData = {
  applicationFormData: ProgramApplicationFormData;
  landerData: ProgramLanderData;
} & Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

export function useBrandingFormContext() {
  return useFormContext<BrandingFormData>();
}

type DraftData = BrandingFormData & { draftSavedAt: string | null };

export function BrandingForm() {
  const { group, mutateGroup, loading } = useGroup<GroupWithProgramProps>(
    {
      query: { includeExpandedFields: true },
    },
    {
      keepPreviousData: true,
    },
  );

  const [draft, setDraft] = useLocalStorage<DraftData | null>(
    `branding-form-${group?.id}`,
    null,
  );

  if (loading) {
    return <LayoutLoader />;
  }

  if (!group) {
    return (
      <div className="text-content-muted text-sm">Failed to load program</div>
    );
  }

  return (
    <BrandingContextProvider>
      <BrandingFormInner
        group={group}
        mutateGroup={mutateGroup}
        draft={draft}
        setDraft={setDraft}
      />
    </BrandingContextProvider>
  );
}

const PREVIEW_TABS = [
  {
    value: "landing",
    label: "Landing page",
    component: LanderPreview,
  },
  {
    value: "application",
    label: "Application form",
    component: ApplicationPreview,
  },
  // {
  //   value: "portal",
  //   label: "Partner portal",
  //   component: PortalPreview,
  // },
  // {
  //   value: "embed",
  //   label: "Referral embed",
  //   component: EmbedPreview,
  // },
];

const defaultApplicationFormData = (
  program: ProgramProps,
): ProgramApplicationFormData => {
  return {
    fields: [
      {
        id: uuid(),
        type: "short-text",
        label: "Website / Social media channel",
        required: true,
        data: {
          placeholder: "https://example.com",
        },
      },
      {
        id: uuid(),
        type: "long-text",
        label: `How do you plan to promote ${program?.name ?? "us"}?`,
        required: true,
        data: {
          placeholder: "",
        },
      },
      {
        id: uuid(),
        type: "long-text",
        label: "Any additional questions or comments?",
        required: false,
        data: {
          placeholder: "",
        },
      },
    ],
  };
};

const dateIsAfter = (
  dateOrDateString: Date | string,
  compareToDateOrDateString: Date | string,
) => {
  const date =
    typeof dateOrDateString === "string"
      ? new Date(dateOrDateString)
      : dateOrDateString;
  const compareToDate =
    typeof compareToDateOrDateString === "string"
      ? new Date(compareToDateOrDateString)
      : compareToDateOrDateString;

  return date.getTime() > compareToDate.getTime();
};

function BrandingFormInner({
  group,
  mutateGroup,
  draft,
  setDraft,
}: {
  group: GroupWithProgramProps;
  mutateGroup: KeyedMutator<GroupWithProgramProps>;
  draft: DraftData | null;
  setDraft: (draft: DraftData | null) => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();
  const previewTab =
    PREVIEW_TABS.find(({ value }) => searchParams.get("tab") === value) ||
    PREVIEW_TABS[0];

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const form = useForm<BrandingFormData>({
    defaultValues: {
      logo: group.program?.logo ?? draft?.logo ?? null,
      wordmark: group.program?.wordmark ?? draft?.wordmark ?? null,
      brandColor: group.program?.brandColor ?? draft?.brandColor ?? null,
      applicationFormData:
        group.applicationFormData ?? defaultApplicationFormData(group.program),
      landerData: group.landerData ?? { blocks: [] },
    },
  });

  const {
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    getValues,
    setValue,

    resetField,
  } = form;

  useEffect(() => {
    if (draft) {
      if (
        !group.landerPublishedAt ||
        (draft.draftSavedAt &&
          dateIsAfter(draft.draftSavedAt, group.landerPublishedAt))
      ) {
        setValue("applicationFormData", draft.applicationFormData, {
          shouldDirty: true,
        });
        setValue("landerData", draft.landerData, { shouldDirty: true });
      }
    }
  }, [draft]);

  const { executeAsync, isPending } = useAction(updateGroupBrandingAction, {
    async onSuccess({ data }) {
      await mutateGroup();
      toast.success("Group updated successfully.");

      const currentValues = getValues();

      // Still reset form state to clear isSubmitSuccessful
      reset({
        ...currentValues,
        applicationFormData:
          data?.applicationFormData ?? currentValues.applicationFormData,
        landerData: data?.landerData ?? currentValues.landerData,
      });
    },
    onError({ error }) {
      console.error(error);
    },
  });

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty) return;

    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  const [isTabPopoverOpen, setIsTabPopoverOpen] = useState(false);

  const { isGeneratingLander } = useBrandingContext();

  const publishButtonActive = useMemo(() => {
    // the lander is being generated with AI, disable publishing
    if (isGeneratingLander) return false;

    // if the lander is not published, allow publishing
    if (!group.landerPublishedAt) return true;

    // if the lander is published, allow publishing if there are changes
    return isDirty;
  }, [isGeneratingLander, group.landerPublishedAt, isDirty]);
  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const result = await executeAsync({
          workspaceId: workspaceId!,
          groupId: group.id,
          ...data,
        });

        if (!result?.data?.success) {
          toast.error("Failed to update application form.");
          setError("root", { message: "Failed to update application form." });
          return;
        }

        setDraft(null);
      })}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
    >
      <FormProvider {...form}>
        <div className="@container flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-5 py-3">
          <div className="grow basis-0">
            <Button
              type="button"
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              data-state={isSidePanelOpen ? "open" : "closed"}
              variant="secondary"
              icon={<Brush className="size-4" />}
              className="size-8 p-0"
            />
          </div>
          <div className="">
            <div className="@[480px]:block hidden">
              <ToggleGroup
                className="rounded-lg bg-neutral-50 p-0.5"
                indicatorClassName="rounded-md bg-white"
                optionClassName="py-1 normal-case"
                options={PREVIEW_TABS}
                selected={previewTab.value}
                selectAction={(value) => {
                  queryParams({ set: { tab: value } });
                }}
              />
            </div>
            <div className="@[480px]:hidden">
              <Popover
                openPopover={isTabPopoverOpen}
                setOpenPopover={setIsTabPopoverOpen}
                content={
                  <div className="grid p-1 max-sm:w-full sm:min-w-48">
                    {PREVIEW_TABS.map((tab) => (
                      <MenuItem
                        key={tab.value}
                        onClick={() => {
                          queryParams({ set: { tab: tab.value } });
                          setIsTabPopoverOpen(false);
                        }}
                      >
                        {tab.label}
                      </MenuItem>
                    ))}
                  </div>
                }
              >
                <Button
                  variant="secondary"
                  className="group h-8 px-2"
                  text={
                    <div className="flex items-center gap-1">
                      {previewTab.label}
                      <ChevronDown className="size-4 shrink-0 text-neutral-400 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                    </div>
                  }
                />
              </Popover>
            </div>
          </div>
          <div className="flex grow basis-0 items-center justify-end gap-4">
            <Drafts draft={draft} setDraft={setDraft} />
            <Button
              type="submit"
              variant="primary"
              text="Publish"
              loading={isPending || isSubmitting || isSubmitSuccessful}
              disabled={!publishButtonActive}
              className="h-8 w-fit px-3"
            />
          </div>
        </div>
        <div
          className={cn(
            "grid grid-cols-1 transition-[grid-template-columns,grid-template-rows] lg:h-[calc(100vh-186px)]",
            isSidePanelOpen
              ? "max-lg:grid-rows-[453px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]"
              : "max-lg:grid-rows-[0px_minmax(0,1fr)] lg:grid-cols-[0px_minmax(0,1fr)]",
          )}
        >
          <div className="h-full overflow-hidden">
            <div
              className={cn(
                "scrollbar-hide h-full overflow-y-auto border-neutral-200 p-5 transition-opacity max-lg:border-b lg:w-[240px] lg:border-r",
                !isSidePanelOpen && "opacity-0",
              )}
            >
              <BrandingSettingsForm />
            </div>
          </div>
          <div className="relative h-full overflow-hidden px-2 pt-2 sm:px-4 sm:pt-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={previewTab.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1, ease: "easeInOut" }}
                className="h-full"
              >
                <previewTab.component group={group} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </FormProvider>
    </form>
  );
}

function Drafts({
  draft,
  setDraft,
}: {
  draft: DraftData | null;
  setDraft: (draft: DraftData | null) => void;
}) {
  const {
    setValue,
    getValues,
    formState: { isDirty },
  } = useBrandingFormContext();

  // Load draft
  useEffect(() => {
    if (!draft) return;

    // Update form values to draft
    // setTimeout: https://github.com/orgs/react-hook-form/discussions/9913#discussioncomment-4936301
    setTimeout(() =>
      (
        [
          "logo",
          "wordmark",
          "brandColor",
          "applicationFormData",
          "landerData",
        ] as const
      ).forEach((key) => {
        setValue(key, draft[key], {
          shouldDirty: true,
        });
      }),
    );
  }, []);

  // Save draft
  useEffect(() => {
    if (!isDirty) return;

    // TODO: Use `subscribe` from a future version of `react-hook-form`
    const interval = setInterval(() => {
      const values = getValues();
      setDraft({
        ...values,
        draftSavedAt: new Date().toISOString(),
      });
    }, 1_000);

    return () => clearInterval(interval);
  }, [isDirty]);

  return isDirty ? (
    <span className="text-content-muted text-sm">Unsaved draft</span>
  ) : null;
}
