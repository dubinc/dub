import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { DiscountCodeProps, EnrolledPartnerProps } from "@/lib/types";
import { createDiscountCodeSchema } from "@/lib/zod/schemas/discount";
import {
  ArrowTurnLeft,
  Button,
  Combobox,
  ComboboxOption,
  Modal,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Tag } from "lucide-react";
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
  const { makeRequest: createDiscountCode, isSubmitting } =
    useApiMutation<DiscountCodeProps>();

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
      onSuccess: async (data) => {
        setShowModal(false);
        await mutatePrefix("/api/discount-codes");
        copyToClipboard(data.code);
        toast.success("Discount code created and copied to clipboard!");
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
                  Discount code (optional)
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Tag className="text-content-default h-4 w-4" />
                </div>
                <input
                  {...register("code")}
                  type="text"
                  id="code"
                  autoFocus={!isMobile}
                  className="block w-full rounded-md border-[1.5px] border-neutral-300 pl-10 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="CODE"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Discount codes cannot be edited after creation
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="referral-link"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Referral link
                </label>
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
                placeholder="Select referral link"
                searchPlaceholder="Search"
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
            text={
              <span className="flex items-center gap-2">
                Create discount code
                <div className="rounded border border-white/20 p-1">
                  <ArrowTurnLeft className="size-3.5" />
                </div>
              </span>
            }
            className="h-8 w-fit pl-2.5 pr-1.5"
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
