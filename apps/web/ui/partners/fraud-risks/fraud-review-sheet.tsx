"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Msgs,
  Sheet,
  User,
  buttonVariants,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, fetcher } from "@dub/utils";
import { useResolveFraudEventModal } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/fraud/resolve-fraud-event-modal";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import useSWR from "swr";
import { FraudEventsTableWrapper } from "./fraud-events-tables";

interface FraudReviewSheetProps {
  fraudEvent: FraudEventProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
  onPrevious?: () => void;
}

function FraudReviewSheetContent({
  fraudEvent,
  onPrevious,
  onNext,
}: FraudReviewSheetProps) {
  const { partner } = fraudEvent;

  const { getQueryString } = useRouterStuff();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { setShowResolveFraudEventModal, ResolveFraudEventModal } =
    useResolveFraudEventModal({
      fraudEvent,
    });

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner,
  });

  const { data: fraudEvents, isLoading: fraudEventsLoading } = useSWR<any>(
    workspaceId && partner.id && fraudEvent.type
      ? `/api/fraud-events/instances${getQueryString({
          workspaceId,
          partnerId: partner.id,
          type: fraudEvent.type,
        })}`
      : null,
    fetcher,
  );

  // Left/right arrow keys for previous/next fraud event
  useKeyboardShortcut("ArrowRight", () => onNext?.(), { sheet: true });
  useKeyboardShortcut("ArrowLeft", () => onPrevious?.(), { sheet: true });

  // Resolve/ban shortcuts
  useKeyboardShortcut("r", () => setShowResolveFraudEventModal(true), {
    sheet: true,
  });
  useKeyboardShortcut("b", () => setShowBanPartnerModal(true), { sheet: true });

  const fraudRule = FRAUD_RULES_BY_TYPE[fraudEvent.type];

  return (
    <div className="relative h-full">
      <ResolveFraudEventModal />
      <BanPartnerModal />
      <div
        className={cn("flex h-full flex-col transition-opacity duration-200")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Fraud review
          </Sheet.Title>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Button
                type="button"
                disabled={!onPrevious}
                onClick={onPrevious}
                variant="secondary"
                className="size-9 rounded-l-lg rounded-r-none p-0"
                icon={<ChevronLeft className="size-3.5" />}
              />
              <Button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                variant="secondary"
                className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
                icon={<ChevronRight className="size-3.5" />}
              />
            </div>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Partner details */}
          <div className="bg-bg-muted border-border-subtle flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-10 rounded-full"
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-content-emphasis truncate text-sm font-semibold">
                  {partner.name}
                </span>
                <span className="text-content-subtle truncate text-xs font-medium">
                  {partner.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/${workspaceSlug}/program/messages/${partner.id}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
                )}
              >
                <Msgs className="size-4 shrink-0" />
                <span className="hidden sm:inline">Message</span>
              </Link>

              <Link
                href={`/${workspaceSlug}/program/partners/${partner.id}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
                )}
              >
                <User className="size-4 shrink-0" />
                <span className="hidden sm:inline">View profile</span>
              </Link>
            </div>
          </div>

          <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-4">
            <div className="flex flex-col">
              <span className="text-content-default text-sm font-semibold">
                {fraudRule.name}
              </span>
              <span className="text-content-subtle text-xs font-normal">
                {fraudRule.description}
              </span>
            </div>

            <FraudEventsTableWrapper fraudEvent={fraudEvent} />
          </div>
        </div>

        <div className="flex grow flex-col justify-end">
          <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              text="Resolve event"
              shortcut="R"
              onClick={() => setShowResolveFraudEventModal(true)}
              className="h-8 w-fit rounded-lg"
            />

            <Button
              type="button"
              text="Ban partner"
              shortcut="B"
              variant="danger"
              onClick={() => setShowBanPartnerModal(true)}
              className="h-8 w-fit rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FraudReviewSheet({
  isOpen,
  nested,
  ...rest
}: FraudReviewSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      nested={nested}
      contentProps={{
        className: "[--sheet-width:940px]",
      }}
    >
      <FraudReviewSheetContent {...rest} />
    </Sheet>
  );
}

export function useFraudReviewSheet(
  props: Omit<FraudReviewSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    fraudReviewSheet: (
      <FraudReviewSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
