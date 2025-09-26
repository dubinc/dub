"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { GroupWithProgramProps, ProgramProps } from "@/lib/types";
import LayoutLoader from "@/ui/layout/layout-loader";
import {
  Brush,
  Button,
  FeatherFill,
  MenuItem,
  Popover,
  ToggleGroup,
  useLocalStorage,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { z } from "zod";
import {
  PageBuilderContextProvider,
  usePageBuilderContext,
} from "./page-builder-context-provider";
import { PageBuilderSettingsForm } from "./page-builder-settings-form";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";
import { ApplicationPreview } from "./previews/application-preview";
import useGroup from "@/lib/swr/use-group";
import { updateGroupApplicationFormAction } from "@/lib/actions/partners/update-group-application-form";

export type PageBuilderFormData = {
  applicationFormData: z.infer<typeof programApplicationFormSchema>;
} & Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

export function usePageBuilderFormContext() {
  return useFormContext<PageBuilderFormData>();
}

export function PageBuilderForm() {
  const { defaultProgramId } = useWorkspace();

  const {
    group,
    mutateGroup,
    loading,
  } = useGroup<GroupWithProgramProps>(
    {},
    {
      query: { includeExpandedFields: true },
    },
    {
      keepPreviousData: true,
    },
  );

  const [draft, setDraft] = useLocalStorage<PageBuilderFormData | null>(
    `application-form-${defaultProgramId}`,
    null,
  );

  if (loading) return <LayoutLoader />;

  if (!group)
    return (
      <div className="text-content-muted text-sm">Failed to load program</div>
    );

  return (
    <PageBuilderContextProvider>
      <PageBuilderFormInner
        group={group}
        mutateGroup={mutateGroup}
        draft={draft}
        setDraft={setDraft}
      />
    </PageBuilderContextProvider>
  );
}

const PREVIEW_TABS = [
  {
    value: "application",
    label: "Application page",
    icon: FeatherFill,
    component: ApplicationPreview,
  },
];

function PageBuilderFormInner({
  group,
  mutateGroup,
  draft,
  setDraft,
}: {
  group: GroupWithProgramProps;
  mutateGroup: KeyedMutator<GroupWithProgramProps>;
  draft: PageBuilderFormData | null;
  setDraft: (draft: PageBuilderFormData | null) => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();
  const previewTab =
    PREVIEW_TABS.find(({ value }) => searchParams.get("tab") === value) ||
    PREVIEW_TABS[0];

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const form = useForm<PageBuilderFormData>({
    defaultValues: {
      logo: group.program?.logo ?? null,
      wordmark: group.program?.wordmark ?? null,
      brandColor: group.program?.brandColor ?? null,
      applicationFormData: group.applicationFormData ?? { fields: [] },
    },
  });

  const {
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    getValues,
  } = form;

  const { executeAsync, isPending } = useAction(updateGroupApplicationFormAction, {
    async onSuccess({ data }) {
      await mutateGroup();
      toast.success("Group updated successfully.");

      const currentValues = getValues();

      if (data?.applicationFormData) {
        // Reset to persisted (in case anything changed)
        reset({
          ...currentValues,
          applicationFormData: data?.applicationFormData,
        });
      } else {
        // Still reset form state to clear isSubmitSuccessful
        reset(currentValues);
      }
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

  const { isGeneratingLander } = usePageBuilderContext();

  // Disable publish button when:
  // - the lander is being generated with AI
  // OR:
  //   - there are no changes
  //   - the program lander is already published
  const disablePublishButton =
    isGeneratingLander || (!isDirty && group.applicationFormPublishedAt)
      ? true
      : false;

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
                optionClassName="text-xs py-1 px-2.5 normal-case"
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
            <Drafts
              enabled={!group.applicationFormData}
              draft={draft}
              setDraft={setDraft}
            />
            <Button
              type="submit"
              variant="primary"
              text="Publish"
              loading={isPending || isSubmitting || isSubmitSuccessful}
              disabled={disablePublishButton}
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
              <PageBuilderSettingsForm />
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
  enabled,
  draft,
  setDraft,
}: {
  enabled: boolean;
  draft: PageBuilderFormData | null;
  setDraft: (draft: PageBuilderFormData | null) => void;
}) {
  const {
    setValue,
    getValues,
    formState: { isDirty },
  } = usePageBuilderFormContext();

  // Load draft
  useEffect(() => {
    if (!enabled || !draft) return;

    // Update form values to draft
    // setTimeout: https://github.com/orgs/react-hook-form/discussions/9913#discussioncomment-4936301
    setTimeout(() =>
      (["logo", "wordmark", "brandColor", "applicationFormData"] as const).forEach(
        (key) => {
          setValue(key, draft[key], {
            shouldDirty: true,
          });
        },
      ),
    );
  }, []);

  // Save draft
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // TODO: Use `subscribe` from a future version of `react-hook-form`
    const interval = setInterval(() => {
      setDraft(getValues());
    }, 1_000);

    return () => clearInterval(interval);
  }, [enabled, isDirty]);

  return enabled && isDirty ? (
    <span className="text-content-muted text-sm">Unsaved draft</span>
  ) : null;
}
