import { partnerReferralSchema } from "@/lib/zod/schemas/partner-referrals";
import { useMarkPartnerReferralClosedLostModal } from "@/ui/modals/mark-partner-referral-closed-lost-modal";
import { useMarkPartnerReferralClosedWonModal } from "@/ui/modals/mark-partner-referral-closed-won-modal";
import { useQualifyPartnerReferralModal } from "@/ui/modals/qualify-partner-referral-modal";
import { useUnqualifyPartnerReferralModal } from "@/ui/modals/unqualify-partner-referral-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Envelope,
  OfficeBuilding,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import {
  COUNTRIES,
  GOOGLE_FAVICON_URL,
  OG_AVATAR_URL,
  getApexDomain,
} from "@dub/utils";
import { Dispatch, SetStateAction, useMemo } from "react";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

type PartnerReferralSheetProps = {
  referral: PartnerReferralProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function ReferralDetails({ referral }: { referral: PartnerReferralProps }) {
  const formData = referral.formData as Record<string, unknown> | null;
  const country = formData?.country as string | undefined;
  const phoneNumber = formData?.phoneNumber as string | undefined;
  const region = formData?.region as string | undefined;
  const numberOfUsers = formData?.numberOfUsers as string | undefined;
  const details = formData?.details as string | undefined;

  return (
    <div className="@3xl/sheet:order-1">
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
        <h3 className="text-content-emphasis mb-4 text-lg font-semibold">
          Referral details
        </h3>
        <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
          <div>
            <div className="text-content-subtle mb-1 text-xs font-medium">
              Name
            </div>
            <div className="text-content-emphasis">{referral.name}</div>
          </div>
          <div>
            <div className="text-content-subtle mb-1 text-xs font-medium">
              Work email
            </div>
            <div className="text-content-emphasis">{referral.email}</div>
          </div>
          <div>
            <div className="text-content-subtle mb-1 text-xs font-medium">
              Company
            </div>
            <div className="text-content-emphasis">{referral.company}</div>
          </div>
          {country && (
            <div>
              <div className="text-content-subtle mb-1 text-xs font-medium">
                Country
              </div>
              <div className="text-content-emphasis flex items-center gap-2">
                {country && (
                  <img
                    alt={`Flag of ${COUNTRIES[country] || country}`}
                    src={`https://flag.vercel.app/m/${country}.svg`}
                    className="size-4 rounded-full"
                  />
                )}
                {COUNTRIES[country] || country}
              </div>
            </div>
          )}
          {phoneNumber && (
            <div>
              <div className="text-content-subtle mb-1 text-xs font-medium">
                Phone number
              </div>
              <div className="text-content-emphasis">{phoneNumber}</div>
            </div>
          )}
          {region && (
            <div>
              <div className="text-content-subtle mb-1 text-xs font-medium">
                Region
              </div>
              <div className="text-content-emphasis">{region}</div>
            </div>
          )}
          {numberOfUsers && (
            <div>
              <div className="text-content-subtle mb-1 text-xs font-medium">
                Number of users
              </div>
              <div className="text-content-emphasis">{numberOfUsers}</div>
            </div>
          )}
          {details && (
            <div>
              <div className="text-content-subtle mb-1 text-xs font-medium">
                Details
              </div>
              <div className="text-content-emphasis whitespace-pre-wrap">
                {details}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferredCustomer({ referral }: { referral: PartnerReferralProps }) {
  const formData = referral.formData as Record<string, unknown> | null;
  const country = formData?.country as string | undefined;

  // Get company logo/favicon from email domain
  const companyLogoUrl = useMemo(() => {
    if (referral.email) {
      const emailDomain = referral.email.split("@")[1];
      if (emailDomain) {
        return `${GOOGLE_FAVICON_URL}${getApexDomain(emailDomain)}`;
      }
    }
    return null;
  }, [referral.email]);

  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="relative w-fit shrink-0">
          <div className="flex size-16 items-center justify-center rounded-full bg-black">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={referral.company}
                className="size-10 rounded-full"
                onError={(e) => {
                  // Fallback to avatar if favicon fails
                  const target = e.target as HTMLImageElement;
                  target.src = `${OG_AVATAR_URL}${referral.id}`;
                  target.className = "size-10 rounded-full";
                }}
              />
            ) : (
              <img
                src={`${OG_AVATAR_URL}${referral.id}`}
                alt={referral.name}
                className="size-10 rounded-full"
              />
            )}
          </div>
        </div>
        {referral.status === "pending" && (
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            New
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-content-emphasis text-lg font-semibold">
          {referral.name}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="text-content-subtle flex items-center gap-2">
          <Envelope className="size-3.5 shrink-0" />
          <span className="text-xs font-medium">{referral.email}</span>
        </div>
        <div className="text-content-subtle flex items-center gap-2">
          <OfficeBuilding className="size-3.5 shrink-0" />
          <span className="text-xs font-medium">{referral.company}</span>
        </div>
        {country && (
          <div className="text-content-subtle flex items-center gap-2">
            <img
              alt={`Flag of ${COUNTRIES[country] || country}`}
              src={`https://flag.vercel.app/m/${country}.svg`}
              className="size-3.5 rounded-full"
            />
            <span className="text-xs font-medium">
              {COUNTRIES[country] || country}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralPartner({ referral }: { referral: PartnerReferralProps }) {
  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
      <h3 className="text-content-emphasis mb-4 text-sm font-semibold">
        Referral partner
      </h3>
      <div className="flex items-center gap-3">
        <img
          src={
            referral.partner.image || `${OG_AVATAR_URL}${referral.partner.id}`
          }
          alt={referral.partner.name}
          className="size-10 rounded-full border border-neutral-100"
        />
        <div className="text-content-emphasis text-sm font-medium">
          {referral.partner.name}
        </div>
      </div>
    </div>
  );
}

function PartnerReferralSheetContent({
  referral,
  onPrevious,
  onNext,
  setIsOpen,
}: PartnerReferralSheetProps) {
  const { setShowQualifyModal, QualifyModal, isQualifying } =
    useQualifyPartnerReferralModal({ referral });

  const { setShowUnqualifyModal, UnqualifyModal, isUnqualifying } =
    useUnqualifyPartnerReferralModal({ referral });

  const {
    setShowModal: setShowClosedWonModal,
    ClosedWonModal,
    isMarkingClosedWon,
  } = useMarkPartnerReferralClosedWonModal({ referral });

  const { setShowClosedLostModal, ClosedLostModal, isMarkingClosedLost } =
    useMarkPartnerReferralClosedLostModal({ referral });

  // right arrow key onNext
  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  // left arrow key onPrevious
  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

  // Determine which buttons to show based on status
  const showQualifyButtons = referral.status === "pending";
  const showClosedButtons = referral.status === "qualified";
  const showNoActions = ["unqualified", "closedWon", "closedLost"].includes(
    referral.status,
  );

  return (
    <>
      {QualifyModal}
      {UnqualifyModal}
      {ClosedWonModal}
      {ClosedLostModal}
      <div className="flex size-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Partner referral
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

        <div className="@3xl/sheet:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] scrollbar-hide grid min-h-0 grow grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Left side - Referral details */}
          <ReferralDetails referral={referral} />

          {/* Right side - Two cards */}
          <div className="@3xl/sheet:order-2 flex flex-col gap-4">
            <ReferredCustomer referral={referral} />
            <ReferralPartner referral={referral} />
          </div>
        </div>

        {/* Footer with action buttons based on status */}
        {!showNoActions && (
          <div className="shrink-0 border-t border-neutral-200 p-5">
            <div className="flex justify-end gap-2">
              {showQualifyButtons && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Unqualify"
                    shortcut="U"
                    onClick={() => setShowUnqualifyModal(true)}
                    disabled={isUnqualifying}
                    className="w-fit shrink-0"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    text="Qualify"
                    shortcut="Q"
                    onClick={() => setShowQualifyModal(true)}
                    disabled={isQualifying}
                    className="w-fit shrink-0"
                  />
                </>
              )}
              {showClosedButtons && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Closed lost"
                    shortcut="L"
                    onClick={() => setShowClosedLostModal(true)}
                    disabled={isMarkingClosedLost}
                    className="w-fit shrink-0"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    text="Closed won"
                    shortcut="W"
                    onClick={() => setShowClosedWonModal(true)}
                    disabled={isMarkingClosedWon}
                    className="w-fit shrink-0"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function PartnerReferralSheet({
  isOpen,
  nested,
  ...rest
}: PartnerReferralSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "referralId", scroll: false })}
      nested={nested}
      contentProps={{
        // 540px - 1170px width based on viewport
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <PartnerReferralSheetContent {...rest} />
    </Sheet>
  );
}
