"use client";

import { createManualPayoutAction } from "@/lib/actions/partners/create-manual-payout";
import usePartners from "@/lib/swr/use-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Combobox,
  DateRangePicker,
  Sheet,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { PayoutType } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

interface CreatePayoutSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface FormData {
  dateRange: {
    start: Date;
    end: Date;
  };
  amount: number;
  partnerId: string;
  type: PayoutType;
  description?: string;
}

function CreatePayoutSheetContent({ setIsOpen }: CreatePayoutSheetProps) {
  const dateRangePickerId = useId();
  const { program } = useProgram();
  const { data: partners } = usePartners();
  const { id: workspaceId } = useWorkspace();

  const today = new Date();

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      dateRange: {
        start: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 31,
        ),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      },
    },
  });

  const partnerId = watch("partnerId");
  const dateRange = watch("dateRange");
  const type = watch("type");
  const partner = partners?.find((p) => p.id === partnerId);

  const partnerOptions = useMemo(() => {
    return partners?.map((partner) => ({
      value: partner.id,
      label: partner.name,
      icon: (
        <img
          src={
            partner.image ||
            `https://api.dicebear.com/9.x/micah/svg?seed=${partner.id}`
          }
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [partners]);

  // const searchParams = useMemo(() => {
  //   return partner?.link
  //     ? {
  //         workspaceId,
  //         event: "composite",
  //         start: dateRange.start.toISOString(),
  //         end: dateRange.end.toISOString(),
  //         linkId: partner?.link?.id,
  //       }
  //     : null;
  // }, [partner?.link, dateRange.start, dateRange.end, workspaceId]);

  // const { data: events } = useSWR<{
  //   [key in AnalyticsResponseOptions]: number;
  // }>(searchParams ? `/api/analytics?${searchParams.toString()}` : null);

  const { executeAsync, isExecuting } = useAction(createManualPayoutAction, {
    onSuccess: async () => {
      toast.success("Successfully created payout!");
      setIsOpen(false);
      mutate(
        `/api/programs/${program?.id}/payouts?workspaceId=${workspaceId}&sortBy=periodStart&order=desc`,
      );
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (workspaceId && program) {
      await executeAsync({
        ...data,
        workspaceId,
        programId: program.id,
        start: data.dateRange.start.toISOString(),
        end: data.dateRange.end.toISOString(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Create payout
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-col gap-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-900">
              Partner
            </label>
            <Combobox
              selected={
                partnerOptions?.find((o) => o.value === partnerId) ?? null
              }
              setSelected={(option) => {
                if (option) {
                  setValue("partnerId", option.value);
                }
              }}
              options={partnerOptions}
              caret={true}
              placeholder="Select partners"
              searchPlaceholder="Search..."
              matchTriggerWidth
              buttonProps={{
                className: cn(
                  "w-full justify-start border-gray-300 px-3",
                  "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
                  "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
                  !partnerId && "text-gray-400",
                ),
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={dateRangePickerId}
              className="block text-sm font-medium text-gray-700"
            >
              Date Range
            </label>
            <DateRangePicker
              id={dateRangePickerId}
              onChange={(dateRange) => {
                if (dateRange) {
                  setValue("dateRange", {
                    start: dateRange.from!,
                    end: dateRange.to!,
                  });
                }
              }}
              value={{
                from: dateRange.start,
                to: dateRange.end,
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="type"
              className="flex items-center space-x-2 text-sm font-medium text-gray-900"
            >
              Type
            </label>
            <select
              {...register("type", { required: true })}
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            >
              {Object.values(PayoutType).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {type !== "sales" && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="amount"
                className="flex items-center space-x-2 text-sm font-medium text-gray-900"
              >
                Amount
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  {...register("amount", {
                    required: true,
                    setValueAs: (value) => Number(value),
                  })}
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="500"
                  type="number"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="flex items-center space-x-2 text-sm font-medium text-gray-900"
            >
              Description
            </label>
            <textarea
              {...register("description")}
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="A note to partner about this payout."
            />
          </div>
        </div>
      </div>

      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isExecuting}
          />
          <Button
            type="submit"
            variant="primary"
            text="Create payout"
            className="w-fit"
            loading={isExecuting}
          />
        </div>
      </div>
    </form>
  );
}

export function CreatePayoutSheet({
  isOpen,
  ...rest
}: CreatePayoutSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId" })}
    >
      <CreatePayoutSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreatePayoutSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createPayoutSheet: (
      <CreatePayoutSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
