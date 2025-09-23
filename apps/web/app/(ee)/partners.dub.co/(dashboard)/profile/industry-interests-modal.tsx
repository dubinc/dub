import { industryInterests } from "@/lib/partners/partner-profile";
import { MAX_PARTNER_INDUSTRY_INTERESTS } from "@/lib/zod/schemas/partners";
import { IndustryInterest } from "@dub/prisma/client";
import { Button, Modal, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useRef, useState } from "react";

type IndustryInterestsModalProps = {
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
  interests: IndustryInterest[];
  onSave: (interests: IndustryInterest[]) => void;
};

export function IndustryInterestsModal({
  show,
  setShow,
  ...rest
}: IndustryInterestsModalProps) {
  return (
    <Modal showModal={show} setShowModal={setShow} className="max-w-lg">
      <IndustryInterestsModalInner show={show} setShow={setShow} {...rest} />
    </Modal>
  );
}

function IndustryInterestsModalInner({
  show,
  setShow,
  interests,
  onSave,
}: {
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
  interests: IndustryInterest[];
  onSave: (interests: IndustryInterest[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const [selectedInterests, setSelectedInterests] =
    useState<IndustryInterest[]>(interests);

  const isMaxSelected =
    selectedInterests.length >= MAX_PARTNER_INDUSTRY_INTERESTS;

  return (
    <div>
      <div className="p-4 pb-2 sm:p-6 sm:pb-4">
        <h4 className="text-content-emphasis text-lg font-semibold">
          Add industry Interests
        </h4>
        <p className="text-content-subtle text-sm">
          Add the industries you care and post content about.
        </p>
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollProgress}
          className="scrollbar-hide flex max-h-[calc(100dvh-200px)] flex-wrap items-center gap-3 overflow-y-auto px-4 pb-8 pt-2 sm:px-6"
        >
          {industryInterests.map((interest) => (
            <label
              key={interest.id}
              className={cn(
                "ring-border-subtle flex cursor-pointer select-none items-center gap-2.5 rounded-full bg-white px-4 py-3 ring-1 transition-all duration-100 ease-out",
                selectedInterests.includes(interest.id)
                  ? "bg-bg-muted ring-2 ring-black"
                  : isMaxSelected
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                className="hidden"
                disabled={
                  isMaxSelected && !selectedInterests.includes(interest.id)
                }
                onChange={(e) =>
                  e.target.checked
                    ? setSelectedInterests([...selectedInterests, interest.id])
                    : setSelectedInterests(
                        selectedInterests.filter((id) => id !== interest.id),
                      )
                }
              />
              <interest.icon className="size-4 text-neutral-600" />
              <span className="text-content-emphasis text-sm font-medium">
                {interest.label}
              </span>
            </label>
          ))}
        </div>

        {/* Scroll fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
          style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
        />
      </div>

      <div className="border-border-subtle flex items-center justify-between gap-4 border-t px-4 py-5 sm:px-6">
        <div>
          <p className="text-content-subtle text-sm tabular-nums">
            {selectedInterests.length}/{MAX_PARTNER_INDUSTRY_INTERESTS} selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            text="Cancel"
            variant="secondary"
            className="h-8 w-fit px-3"
            onClick={() => setShow(false)}
          />
          <Button
            text="Save interests"
            variant="primary"
            className="h-8 w-fit px-3"
            onClick={() => {
              onSave(selectedInterests);
              setShow(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
