"use client";

import { AdditionalPartnerLink } from "@/lib/types";
import { Button, Input, Modal } from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const URL_VALIDATION_MODES = [
  {
    value: "domain",
    label: "Any page",
    description: "Allows links to any page under this domain",
  },
  {
    value: "exact",
    label: "Single page",
    description: "Restricts links to this single destination URL",
  },
];

interface AddDestinationUrlModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function AddDestinationUrlModalContent({
  setIsOpen,
}: AddDestinationUrlModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AdditionalPartnerLink>({
    defaultValues: {
      url: "",
      urlValidationMode: "domain",
    },
  });

  const urlValidationMode = watch("urlValidationMode");

  const onSubmit = async (data: AdditionalPartnerLink) => {
    // TODO: Add backend integration here
    console.log("Form data:", data);
    toast.success("Destination URL added successfully");
    setIsOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">Add destination URL</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-800">
              Destination URL
            </label>
            <Input
              value={watch("url") || ""}
              onChange={(e) => setValue("url", e.target.value)}
              type="url"
              placeholder="https://dub.co"
              className="max-w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-800">
              Allowed link types
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {URL_VALIDATION_MODES.map((type) => {
                const isSelected = type.value === urlValidationMode;

                return (
                  <label
                    key={type.value}
                    className={cn(
                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                      "hover:bg-neutral-50",
                      "transition-all duration-150",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      className="hidden"
                      {...register("urlValidationMode")}
                    />

                    <div className="flex grow flex-col text-sm">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-neutral-600">
                        {type.description}
                      </span>
                    </div>

                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              required
            />
            <label
              htmlFor="conversionTracking"
              className="text-sm text-neutral-600"
            >
              I confirm that conversion tracking has been set up on this URL.{" "}
              <a
                href="https://dub.co/docs/partners/quickstart"
                target="_blank"
                rel="noreferrer noopener"
                className="text-neutral-900 underline hover:text-neutral-700"
              >
                Learn more
              </a>
            </label>
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
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            text="Add destination URL"
            className="w-fit"
            loading={isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}

export function AddDestinationUrlModal({
  isOpen,
  setIsOpen,
}: AddDestinationUrlModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <AddDestinationUrlModalContent setIsOpen={setIsOpen} />
    </Modal>
  );
}

export function useAddDestinationUrlModal(
  props: Omit<AddDestinationUrlModalProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    addDestinationUrlModal: (
      <AddDestinationUrlModal
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
