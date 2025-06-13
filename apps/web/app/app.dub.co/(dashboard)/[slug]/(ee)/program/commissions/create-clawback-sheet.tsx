import useWorkspace from "@/lib/swr/use-workspace";
import {
  CLAWBACK_REASONS,
  createClawbackSchema,
} from "@/lib/zod/schemas/commissions";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

interface CreateClawbackSheetProps {
  setIsOpen: (open: boolean) => void;
  isOpen: boolean;
  nested?: boolean;
}

type FormData = z.infer<typeof createClawbackSchema>;

function CreateClawbackSheetContent(
  props: Omit<CreateClawbackSheetProps, "nested">,
) {
  const { setIsOpen } = props;
  const { id: workspaceId } = useWorkspace();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      partnerId: "",
      amount: undefined,
      reason: "",
    },
  });

  // TODO: Implement submit logic
  const onSubmit = (data: FormData) => {
    // TODO: Handle submit action
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between p-6">
          <Sheet.Title className="text-xl font-semibold">
            Create clawback
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
        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="partnerId"
              className="text-sm font-medium text-neutral-900"
            >
              Partner
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <Controller
                name="partnerId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <PartnerSelector
                    selectedPartnerId={field.value}
                    setSelectedPartnerId={field.onChange}
                  />
                )}
              />
              {errors.partnerId && (
                <span className="text-xs text-red-600">
                  {errors.partnerId.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="amount"
              className="text-sm font-medium text-neutral-900"
            >
              Amount
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                $
              </span>
              <Controller
                name="amount"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    placeholder="0.00"
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : parseFloat(e.target.value),
                      )
                    }
                  />
                )}
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                USD
              </span>
              {errors.amount && (
                <span className="text-xs text-red-600">
                  {errors.amount.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="reason"
              className="text-sm font-medium text-neutral-900"
            >
              Reason
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <Controller
                name="reason"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <select
                    id="reason"
                    className="block w-full rounded-md border-neutral-300 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <option value="" disabled>
                      Select reason
                    </option>
                    {CLAWBACK_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.reason && (
                <span className="text-xs text-red-600">
                  {errors.reason.message}
                </span>
              )}
            </div>
          </div>
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
          />
          <Button
            type="submit"
            variant="primary"
            text="Create clawback"
            className="w-fit"
            // disabled={...} // Optionally disable if fields are empty
          />
        </div>
      </div>
    </form>
  );
}

function CreateClawbackSheet({
  isOpen,
  setIsOpen,
  nested,
}: CreateClawbackSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen} nested={nested}>
      <CreateClawbackSheetContent isOpen={isOpen} setIsOpen={setIsOpen} />
    </Sheet>
  );
}

export function useCreateClawbackSheet(
  props: { nested?: boolean } & Omit<
    CreateClawbackSheetProps,
    "setIsOpen" | "isOpen"
  >,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createClawbackSheet: (
      <CreateClawbackSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
