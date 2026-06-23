"use client";

import { useAttributeReferringPartnerModal } from "@/lib/partner-referrals/components/attribute-referring-partner-modal";
import { usePartnerReferral } from "@/lib/partner-referrals/hooks/use-partner-referral";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import Link from "next/link";
import { PartnerAvatar } from "./partner-avatar";

export function ReferredByPartner({
  partner,
}: {
  partner: Pick<
    EnrolledPartnerExtendedProps,
    "id" | "name" | "image" | "email" | "groupId" | "totalCommissions"
  >;
}) {
  const { slug } = useWorkspace();

  const { referral, loading, error } = usePartnerReferral({
    partnerId: partner?.id,
  });

  const {
    AttributeReferringPartnerModal,
    setShowAttributeReferringPartnerModal,
  } = useAttributeReferringPartnerModal({ partner });

  if (error) {
    return null;
  }

  if (loading) {
    return (
      <span className="flex min-w-0 items-center gap-1">
        <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
        <div className="size-4 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
      </span>
    );
  }

  // Has a referring partner
  if (referral && referral.referredBy) {
    return (
      <span className="flex min-w-0 items-center gap-1">
        Referred by
        <Link
          href={`/${slug}/program/partners/${referral.referredBy.id}`}
          className="inline-flex min-w-0 max-w-full cursor-alias items-center gap-1 rounded decoration-dotted underline-offset-2 hover:underline"
        >
          <PartnerAvatar partner={referral.referredBy} className="size-3.5" />
          <span className="truncate">{referral.referredBy.name}</span>
        </Link>
      </span>
    );
  }

  return (
    <>
      <AttributeReferringPartnerModal />
      <button
        type="button"
        onClick={() => setShowAttributeReferringPartnerModal(true)}
        aria-label="Attribute referring partner"
        className="bg-bg-inverted/5 text-content-default hover:bg-bg-inverted/10 -my-0.5 inline-flex h-5 min-w-0 select-none items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium transition-all"
      >
        Attribute referring partner
      </button>
    </>
  );
}
