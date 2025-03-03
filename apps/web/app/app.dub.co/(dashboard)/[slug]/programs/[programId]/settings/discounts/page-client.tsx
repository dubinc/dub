"use client";

import useDiscounts from "@/lib/swr/use-discounts";
import useProgram from "@/lib/swr/use-program";
import type { DiscountProps } from "@/lib/types";
import { useDiscountSheet } from "@/ui/partners/add-edit-discount-sheet";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { EventType } from "@dub/prisma/client";
import { Badge, Button, MoneyBill } from "@dub/ui";
import { Cookie } from "lucide-react";

export function ProgramSettingsDiscountsPageClient() {
  return (
    <div className="flex flex-col gap-6">
      <DefaultDiscount />
      <AdditionalDiscounts />
    </div>
  );
}

const DefaultDiscount = () => {
  const { program } = useProgram();
  const { discounts, loading } = useDiscounts();

  const defaultDiscount =
    program?.defaultDiscountId &&
    discounts?.find((d) => d.id === program.defaultDiscountId);

  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    ...(defaultDiscount && { discount: defaultDiscount }),
    isDefault: true,
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Referral Discount <Badge variant="gray">Default</Badge>
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              The discount offered to all customers when referred by your
              partners
            </p>
          </div>
        </div>

        {loading ? (
          <DiscountSkeleton />
        ) : defaultDiscount ? (
          <Discount discount={defaultDiscount} isDefault={true} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full border border-neutral-300">
                  <MoneyBill className="size-5" />
                </div>
                <p className="text-sm text-neutral-600">
                  No default referral discount created
                </p>
              </div>
              <Button
                text="Create default discount"
                variant="primary"
                className="h-9 w-fit"
                onClick={() => setIsOpen(true)}
              />
            </div>

            {DiscountSheet}
          </>
        )}
      </div>
    </div>
  );
};

const AdditionalDiscounts = () => {
  const { program } = useProgram();
  const { discounts, loading } = useDiscounts();

  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    isDefault: false,
  });

  const additionalDiscounts = discounts?.filter(
    (discount) => discount.id !== program?.defaultDiscountId,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Additional Referral Discounts
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Add additional discounts for your referred customers
            </p>
          </div>
          <Button
            text="Create discount"
            variant="primary"
            className="h-9 w-fit"
            onClick={() => setIsOpen(true)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <DiscountSkeleton />
            <DiscountSkeleton />
          </div>
        ) : additionalDiscounts && additionalDiscounts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {additionalDiscounts.map((discount) => (
              <Discount
                key={discount.id}
                discount={discount}
                isDefault={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Additional Discounts"
            description="No additional discounts have been added yet"
          />
        )}
      </div>
      {DiscountSheet}
    </div>
  );
};

const Discount = ({
  discount,
  isDefault,
}: {
  discount: DiscountProps;
  isDefault: boolean;
}) => {
  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    ...(discount && { discount }),
    isDefault,
  });

  return (
    <>
      <div
        className="flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 p-4 transition-all hover:border-neutral-300"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Cookie className="size-4 text-neutral-600" />
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal">
              <ProgramRewardDescription discount={discount} />
            </span>
          </div>
          {discount.partnersCount && discount?.partnersCount > 0 ? (
            <Badge variant="green">{discount.partnersCount} partners</Badge>
          ) : (
            <Badge variant="gray">All partners</Badge>
          )}
        </div>
      </div>
      {DiscountSheet}
    </>
  );
};

const DiscountSkeleton = () => {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50" />
      <div className="flex flex-1 items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 w-64 rounded bg-neutral-100" />
          <div className="h-4 w-32 rounded bg-neutral-100" />
        </div>
        <div className="h-6 w-24 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
};

const EmptyState = ({
  title,
  description,
  event,
  onClick,
}: {
  title: string;
  description: string;
  event?: EventType;
  onClick?: () => void;
}) => {
  if (event === "sale") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full border border-neutral-300">
            <MoneyBill className="size-5" />
          </div>
          <p className="text-sm text-neutral-600">
            No default referral discount created
          </p>
        </div>
        <Button
          text="Create default discount"
          variant="primary"
          className="h-[32px] w-fit"
          onClick={onClick}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-50 py-12">
      <div className="flex items-center justify-center">
        <Cookie className="size-6 text-neutral-800" />
      </div>
      <div className="flex flex-col items-center gap-1 px-4 text-center">
        <p className="text-base font-medium text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    </div>
  );
};
