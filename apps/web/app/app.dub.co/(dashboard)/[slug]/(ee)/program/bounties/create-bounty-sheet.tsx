import useWorkspace from "@/lib/swr/use-workspace";
import { createBountySchema } from "@/lib/zod/schemas/bounties";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { X } from "@/ui/shared/icons";
import { Button, CardSelector, CardSelectorOption, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateBountySheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partnerId?: string;
}

type FormData = z.infer<typeof createBountySchema>;

const BOUNTY_TYPES: CardSelectorOption[] = [
  {
    key: "performance",
    label: "Performance-based",
    description: "Reward for reaching milestones",
  },
  {
    key: "submission",
    label: "Submission",
    description: "Reward for task completion",
  },
];

function CreateBountySheetContent({
  setIsOpen,
  partnerId: initialPartnerId,
}: CreateBountySheetProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const [openAccordions, setOpenAccordions] = useState<string[]>([
    "partner-and-type",
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = useForm<FormData>({
    defaultValues: {
      type: "performance",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId) {
      toast.error("Please fill all required fields.");
      return;
    }
  };

  const shouldDisableSubmit = useMemo(() => {
    //
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Create bounty
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <ProgramSheetAccordion
            type="multiple"
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="space-y-6"
          >
            <ProgramSheetAccordionItem value="partner-and-type">
              <ProgramSheetAccordionTrigger>
                Bounty type
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="space-y-4">
                  <p className="text-sm text-neutral-600">
                    Set how the bounty will be completed
                  </p>
                  <CardSelector
                    options={BOUNTY_TYPES}
                    value={watch("type")}
                    onChange={(value: FormData["type"]) =>
                      setValue("type", value)
                    }
                    name="bounty-type"
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
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            // disabled={isPending}
          />

          <Button
            type="submit"
            variant="primary"
            text="Create bounty"
            className="w-fit"
            // loading={isPending}
            // disabled={shouldDisableSubmit}
          />
        </div>
      </div>
    </form>
  );
}

export function CreateBountySheet({
  isOpen,
  nested,
  ...rest
}: CreateBountySheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <CreateBountySheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateBountySheet(
  props: { nested?: boolean } & Omit<CreateBountySheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createBountySheet: (
      <CreateBountySheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
