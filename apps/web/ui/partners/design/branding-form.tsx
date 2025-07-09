"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps, ProgramWithLanderDataProps } from "@/lib/types";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
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
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { z } from "zod";
import {
  BrandingContextProvider,
  useBrandingContext,
} from "./branding-context-provider";
import { BrandingSettingsForm } from "./branding-settings-form";
import { EmbedPreview } from "./previews/embed-preview";
import { LanderPreview } from "./previews/lander-preview";
import { PortalPreview } from "./previews/portal-preview";

export type BrandingFormData = {
  landerData: z.infer<typeof programLanderSchema>;
} & Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

export function useBrandingFormContext() {
  return useFormContext<BrandingFormData>();
}

export function BrandingForm() {
  const { defaultProgramId } = useWorkspace();
  const {
    program,
    mutate: mutateProgram,
    loading,
  } = useProgram<ProgramWithLanderDataProps>(
    {
      query: { includeLanderData: true },
    },
    {
      keepPreviousData: true,
    },
  );

  const [draft, setDraft] = useLocalStorage<BrandingFormData | null>(
    `program-lander-${defaultProgramId}`,
    null,
  );

  if (loading) return <LayoutLoader />;

  if (!program)
    return (
      <div className="text-content-muted text-sm">Failed to load program</div>
    );

  return (
    <BrandingContextProvider>
      <BrandingFormInner
        program={program}
        mutateProgram={mutateProgram}
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
    value: "portal",
    label: "Partner portal",
    component: PortalPreview,
  },
  {
    value: "embed",
    label: "Referral embed",
    component: EmbedPreview,
  },
];

function BrandingFormInner({
  program,
  mutateProgram,
  draft,
  setDraft,
}: {
  program: ProgramWithLanderDataProps;
  mutateProgram: KeyedMutator<ProgramWithLanderDataProps>;
  draft: BrandingFormData | null;
  setDraft: (draft: BrandingFormData | null) => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();
  const previewTab =
    PREVIEW_TABS.find(({ value }) => searchParams.get("tab") === value) ||
    PREVIEW_TABS[0];

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const form = useForm<BrandingFormData>({
    defaultValues: {
      logo: program?.logo ?? null,
      wordmark: program?.wordmark ?? null,
      brandColor: program?.brandColor ?? null,
      landerData: program?.landerData ?? { blocks: [] },
    },
  });

  const {
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    getValues,
  } = form;

  const { executeAsync, isPending } = useAction(updateProgramAction, {
    async onSuccess({ data }) {
      await mutateProgram();
      toast.success("Program updated successfully.");

      const currentValues = getValues();

      if (data?.program.landerData) {
        // Reset to persisted (in case anything changed)
        reset({
          ...currentValues,
          landerData: data?.program.landerData,
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

  const { isGeneratingLander } = useBrandingContext();

  // Disable publish button when:
  // - the lander is being generated with AI
  // OR:
  //   - there are no changes
  //   - the program lander is already published
  const disablePublishButton =
    isGeneratingLander || (!isDirty && program.landerPublishedAt)
      ? true
      : false;

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const result = await executeAsync({
          workspaceId: workspaceId!,
          ...data,
        });

        if (!result?.data?.success) {
          toast.error("Failed to update program.");
          setError("root", { message: "Failed to update program." });
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
              enabled={!program.landerData}
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
                <previewTab.component program={program} />
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
  draft: BrandingFormData | null;
  setDraft: (draft: BrandingFormData | null) => void;
}) {
  const {
    setValue,
    getValues,
    formState: { isDirty },
  } = useBrandingFormContext();

  // Load draft
  useEffect(() => {
    if (!enabled || !draft) return;

    // Update form values to draft
    // setTimeout: https://github.com/orgs/react-hook-form/discussions/9913#discussioncomment-4936301
    setTimeout(() =>
      (["logo", "wordmark", "brandColor", "landerData"] as const).forEach(
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
