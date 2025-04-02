"use client";

import { createManualPayoutAction } from "@/lib/actions/partners/create-manual-payout";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartners from "@/lib/swr/use-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { X } from "@/ui/shared/icons";
import { Button, Combobox, Sheet, useEnterSubmit } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams, useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreatePayoutSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partnerId?: string;
}

const schema = createManualPayoutSchema.pick({
  amount: true,
  description: true,
  partnerId: true,
});

type FormData = z.infer<typeof schema>;

function CreatePayoutSheetContent(props: CreatePayoutSheetProps) {
  const { setIsOpen } = props;

  const router = useRouter();
  const dateRangePickerId = useId();
  const { program } = useProgram();
  const { data: partners } = usePartners();
  const { id: workspaceId } = useWorkspace();
  const { slug, programId } = useParams();

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      partnerId: props.partnerId,
    },
  });

  const { amount, partnerId } = watch();

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

  const { executeAsync, isPending } = useAction(createManualPayoutAction, {
    onSuccess: async (res) => {
      toast.success("Successfully created payout!");
      setIsOpen(false);
      await mutatePrefix(`/api/programs/${program?.id}/payouts`);

      const payoutId = res.data?.id;

      if (payoutId) {
        router.push(
          `/${slug}/programs/${programId}/payouts?payoutId=${payoutId}`,
        );
      }
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program || !partnerId || !amount) {
      toast.error("Please fill all required fields");
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
      programId: program.id,
      amount: amount * 100,
      partnerId,
    });
  };

  const selectedPartner = partners?.find((p) => p.id === partnerId);

  const buttonDisabled = isPending || !partnerId;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col"
    >
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Create manual payout
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="flex flex-col gap-4 p-6">
          {!props.partnerId && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-900">
                Partner
                <span className="ml-1 font-normal text-neutral-500">
                  (required)
                </span>
              </label>
              <Combobox
                selected={
                  partnerOptions?.find((o) => o.value === partnerId) ?? null
                }
                setSelected={(option) => {
                  if (option) {
                    setValue("partnerId", option.value);
                    clearErrors("partnerId");
                  }
                }}
                options={partnerOptions}
                caret={true}
                placeholder="Select partner"
                searchPlaceholder="Search..."
                matchTriggerWidth
                buttonProps={{
                  className: cn(
                    "w-full justify-start border-neutral-300 px-3",
                    "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                    "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                    !partnerId && "text-neutral-400",
                    errors.partnerId && "border-red-500",
                  ),
                }}
              />
              {errors.partnerId && (
                <p className="text-xs text-red-600">
                  {errors.partnerId.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="amount"
              className="flex justify-between text-sm font-medium text-neutral-800"
            >
              Amount
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                $
              </span>
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  "pl-6 pr-12",
                  errors.amount &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("amount", {
                  required: true,
                  valueAsNumber: true,
                })}
                autoComplete="off"
                placeholder="100"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                USD
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="flex items-center space-x-2 text-sm font-medium text-neutral-900"
            >
              Description{" "}
              <span className="ml-1 font-normal text-neutral-500">
                (optional)
              </span>
            </label>
            <textarea
              {...register("description")}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="A note to the partner about this payout. Max 190 characters."
              maxLength={190}
              onKeyDown={handleKeyDown}
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
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            text="Create payout"
            className="w-fit"
            loading={isPending}
            disabled={buttonDisabled}
          />
        </div>
      </div>
    </form>
  );
}

export function CreatePayoutSheet({
  isOpen,
  nested,
  ...rest
}: CreatePayoutSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <CreatePayoutSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreatePayoutSheet(
  props: { nested?: boolean } & Omit<CreatePayoutSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createPayoutSheet: (
      <CreatePayoutSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
