import { partnerProfileReferralSchema } from "@/lib/zod/schemas/partner-profile";
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

type PartnerProfileReferralProps = z.infer<typeof partnerProfileReferralSchema>;

type PartnerProfileReferralSheetProps = {
  referral: PartnerProfileReferralProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function ReferralDetails({
  referral,
}: {
  referral: PartnerProfileReferralProps;
}) {
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
        </div>
      </div>
    </div>
  );
}

function CustomerDetails({
  referral,
}: {
  referral: PartnerProfileReferralProps;
}) {
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

function PartnerProfileReferralSheetContent({
  referral,
  onPrevious,
  onNext,
  setIsOpen,
}: PartnerProfileReferralSheetProps) {
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

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Referral details
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

        {/* Right side - Customer details */}
        <div className="@3xl/sheet:order-2 flex flex-col gap-4">
          <CustomerDetails referral={referral} />
        </div>
      </div>
    </div>
  );
}

export function PartnerProfileReferralSheet({
  isOpen,
  nested,
  ...rest
}: PartnerProfileReferralSheetProps & {
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
      <PartnerProfileReferralSheetContent {...rest} />
    </Sheet>
  );
}
