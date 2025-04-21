import { createCommissionAction } from "@/lib/actions/partners/create-commission";
import { handleMoneyInputChange } from "@/lib/form-utils";
import usePartners from "@/lib/swr/use-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { CustomerSelector } from "@/ui/customers/customer-selector";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Combobox,
  Sheet,
  Switch,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateCommissionSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.infer<typeof createCommissionSchema>;

function CreateCommissionSheetContent({
  setIsOpen,
}: CreateCommissionSheetProps) {
  const { program } = useProgram();
  const { partners } = usePartners();
  const { id: workspaceId } = useWorkspace();
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [hasDifferentCreationDate, setHasDifferentCreationDate] =
    useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const [partnerId, linkId, customerId, saleDate] = watch([
    "partnerId",
    "linkId",
    "customerId",
    "saleDate",
  ]);

  useEffect(() => {
    if (!hasDifferentCreationDate) {
      setValue("leadDate", null);
    }
  }, [hasDifferentCreationDate, setValue]);

  const partnerOptions = useMemo(() => {
    return partners?.map((partner) => ({
      value: partner.id,
      label: partner.name,
      icon: (
        <img
          src={
            partner.image || `https://api.dub.co/og/avatar?seed=${partner.id}`
          }
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [partners]);

  const { executeAsync, isPending } = useAction(createCommissionAction, {
    onSuccess: async () => {
      toast.success("A commission has been created for the partner!");
      setIsOpen(false);
    },
    onError({ error }) {
      console.log(error);
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      toast.error("Please fill all required fields.");
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
      programId: program.id,
      saleDate: data.saleDate ? new Date(data.saleDate).toISOString() : null,
      leadDate: data.leadDate ? new Date(data.leadDate).toISOString() : null,
      saleAmount: data.saleAmount ? data.saleAmount * 100 : null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between p-6">
          <Sheet.Title className="text-xl font-semibold">
            Create commission
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
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="name" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-neutral-900">
                  Partner
                </h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
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
                  placeholder="Select partner"
                  searchPlaceholder="Search partner..."
                  matchTriggerWidth
                  buttonProps={{
                    className: cn(
                      "w-full justify-start border-neutral-300 px-3",
                      "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                      "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                    ),
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-neutral-900">
                  Referral link
                </h2>
              </label>
              <div className="mt-2">
                <PartnerLinkSelector
                  selectedLinkId={linkId}
                  partnerId={partnerId}
                  setSelectedLinkId={(id) => {
                    setValue("linkId", id, { shouldDirty: true });
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="saleDate" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-neutral-900">
                  Sale date
                </h2>
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  id="saleDate"
                  className={cn(
                    "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.saleDate &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("saleDate")}
                  value={
                    saleDate
                      ? new Date(saleDate).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setValue("saleDate", new Date(e.target.value));
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="saleAmount"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-neutral-900">
                  Sale amount
                </h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                  $
                </span>
                <input
                  className={cn(
                    "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.saleAmount &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("saleAmount", {
                    valueAsNumber: true,
                    min: 0,
                    onChange: handleMoneyInputChange,
                  })}
                  placeholder="0.00"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  USD
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-neutral-900">
                  Customer
                </h2>
              </label>
              <div className="mt-2">
                <CustomerSelector
                  selectedCustomerId={customerId}
                  setSelectedCustomerId={(id) => {
                    setValue("customerId", id, { shouldDirty: true });
                  }}
                  setIsNewCustomer={setIsNewCustomer}
                />
              </div>
            </div>

            <AnimatedSizeContainer
              height
              transition={{ ease: "easeInOut", duration: 0.2 }}
            >
              {isNewCustomer && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <Switch
                      fn={setHasDifferentCreationDate}
                      checked={hasDifferentCreationDate}
                      trackDimensions="w-8 h-4"
                      thumbDimensions="w-3 h-3"
                      thumbTranslate="translate-x-4"
                    />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-medium text-neutral-700">
                        Customer creation date is different than the sale date
                      </h3>
                    </div>
                  </div>

                  {hasDifferentCreationDate && (
                    <div>
                      <label
                        htmlFor="leadDate"
                        className="flex items-center space-x-2"
                      >
                        <h2 className="text-sm font-medium text-neutral-900">
                          Customer creation date
                        </h2>
                      </label>
                      <div className="mt-2">
                        <input
                          type="date"
                          id="leadDate"
                          className={cn(
                            "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.leadDate &&
                              "border-red-600 focus:border-red-500 focus:ring-red-600",
                          )}
                          {...register("leadDate")}
                          onChange={(e) => {
                            if (e.target.value) {
                              setValue("leadDate", new Date(e.target.value));
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AnimatedSizeContainer>
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
            disabled={isPending}
          />

          <Button
            type="submit"
            variant="primary"
            text="Create commission"
            className="w-fit"
            loading={isPending}
            disabled={!partnerId || !linkId}
          />
        </div>
      </div>
    </form>
  );
}

export function CreateCommissionSheet({
  isOpen,
  ...rest
}: CreateCommissionSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <CreateCommissionSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateCommissionSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createCommissionSheet: (
      <CreateCommissionSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
