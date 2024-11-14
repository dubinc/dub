import { EnrolledPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, StatusBadge } from "@dub/ui";
import { COUNTRIES, currencyFormatter, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { PartnerStatusBadges } from "./partner-status-badges";

type PartnerDetailsSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerDetailsSheetContent({ partner }: PartnerDetailsSheetProps) {
  const badge = PartnerStatusBadges[partner.status];

  const saleAmount = (partner.link?.saleAmount ?? 0) / 100;
  const earnings = (partner.earnings ?? 0) / 100;

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Partner details
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="p-6">
          {/* Basic info */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <img
                src={partner.logo || `${DICEBEAR_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-12 rounded-full"
              />
              <div className="mt-4 flex items-center gap-2">
                <span className="text-lg font-semibold text-neutral-900">
                  {partner.name}
                </span>
                {badge && (
                  <StatusBadge icon={null} variant={badge.variant}>
                    {badge.label}
                  </StatusBadge>
                )}
              </div>
            </div>
            {partner.country && (
              <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                <img
                  alt=""
                  src={`https://flag.vercel.app/m/${partner.country}.svg`}
                  className="h-3 w-4"
                />
                {COUNTRIES[partner.country]}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 flex divide-x divide-neutral-200">
            {[
              [
                "Revenue",
                !partner.link
                  ? "-"
                  : currencyFormatter(saleAmount, {
                      minimumFractionDigits: saleAmount % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    }),
              ],
              ["Sales", !partner.link ? "-" : partner.link?.sales],
              [
                "Earnings",
                currencyFormatter(earnings, {
                  minimumFractionDigits: earnings % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                }),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col px-5 first:pl-0">
                <span className="text-xs text-neutral-500">{label}</span>
                <span className="text-base text-neutral-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
            WIP
          </div>
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          WIP
        </div>
      </div>
    </>
  );
}

export function PartnerDetailsSheet({
  isOpen,
  ...rest
}: PartnerDetailsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PartnerDetailsSheetContent {...rest} />
    </Sheet>
  );
}

export function usePartnerDetailsSheet({
  partner,
}: Omit<PartnerDetailsSheetProps, "setIsOpen">) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    partnerDetailsSheet: (
      <PartnerDetailsSheet
        partner={partner}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ),
    setIsOpen,
  };
}
