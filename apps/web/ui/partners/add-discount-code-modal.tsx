import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { EnrolledPartnerProps } from "@/lib/types";
import { createDiscountCodeSchema } from "@/lib/zod/schemas/discount";
import {
  Button,
  Combobox,
  ComboboxOption,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { X } from "../shared/icons";

type FormData = z.infer<typeof createDiscountCodeSchema>;

interface AddDiscountCodeModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  partner: EnrolledPartnerProps;
}

const AddDiscountCodeModal = ({
  showModal,
  setShowModal,
  partner,
}: AddDiscountCodeModalProps) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { isMobile } = useMediaQuery();
  const formRef = useRef<HTMLFormElement>(null);
  const [debouncedSearch] = useDebounce(search, 500);
  const [, copyToClipboard] = useCopyToClipboard();
  const { makeRequest: createDiscountCode, isSubmitting } = useApiMutation();

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      code: "",
      linkId: "",
    },
  });

  const [linkId] = watch(["linkId"]);

  // Get partner links for the dropdown
  const partnerLinks = partner.links || [];
  const selectedLink = partnerLinks.find((link) => link.id === linkId);

  const linkOptions = useMemo(() => {
    if (!debouncedSearch) {
      return partnerLinks.map((link) => ({
        value: link.id,
        label: link.shortLink,
      }));
    }

    return partnerLinks
      .filter((link) =>
        link.shortLink.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
      .map((link) => ({
        value: link.id,
        label: link.shortLink,
      }));
  }, [partnerLinks, debouncedSearch]);

  const onSubmit = async (formData: FormData) => {
    await createDiscountCode("/api/discount-codes", {
      method: "POST",
      body: {
        ...formData,
        partnerId: partner.id,
      },
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Discount code created successfully.");
        await mutatePrefix("/api/discount-codes");
      },
    });
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col items-start justify-between gap-4 px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <h3 className="text-lg font-medium">New discount code</h3>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Discount code
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="Discount codes cannot be edited after creation"
                      cta="Learn more."
                      href="https://dub.co/help/article/discount-codes"
                    />
                  }
                />
              </div>

              <input
                {...register("code")}
                type="text"
                id="code"
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="Enter discount code (optional)"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="referral-link"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Referral link
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="Select the partner link to associate with this discount code."
                      cta="Learn more."
                      href="https://dub.co/help/article/discount-codes"
                    />
                  }
                />
              </div>

              <Combobox
                selected={
                  selectedLink
                    ? {
                        value: selectedLink.id,
                        label: selectedLink.shortLink,
                      }
                    : null
                }
                setSelected={(option: ComboboxOption) => {
                  if (!option) {
                    return;
                  }

                  setValue("linkId", option.value);
                }}
                options={linkOptions}
                caret={true}
                placeholder="Select link..."
                searchPlaceholder="Search links..."
                buttonProps={{
                  className: cn(
                    "w-full h-10 justify-start px-3",
                    "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                    "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                  ),
                }}
                optionClassName="sm:max-w-[400px]"
                shouldFilter={false}
                open={isOpen}
                onOpenChange={setIsOpen}
                onSearchChange={setSearch}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 bg-neutral-50 p-4">
          <Button
            type="submit"
            text="Create discount code"
            className="h-8 w-fit px-3"
            loading={isSubmitting}
            disabled={!linkId}
          />
        </div>
      </form>
    </Modal>
  );
};

export function useAddDiscountCodeModal({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  const [showAddDiscountCodeModal, setShowAddDiscountCodeModal] =
    useState(false);

  const AddDiscountCodeModalCallback = useCallback(() => {
    return (
      <AddDiscountCodeModal
        showModal={showAddDiscountCodeModal}
        setShowModal={setShowAddDiscountCodeModal}
        partner={partner}
      />
    );
  }, [showAddDiscountCodeModal, setShowAddDiscountCodeModal, partner]);

  return useMemo(
    () => ({
      setShowAddDiscountCodeModal,
      AddDiscountCodeModal: AddDiscountCodeModalCallback,
    }),
    [setShowAddDiscountCodeModal, AddDiscountCodeModalCallback],
  );
}
