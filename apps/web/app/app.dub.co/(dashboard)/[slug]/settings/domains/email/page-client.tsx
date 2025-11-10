"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { useEmailDomains } from "@/lib/swr/use-email-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { ArrowTurnRight2, Button, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { EmailDomainCard } from "app/app.dub.co/(dashboard)/[slug]/settings/domains/email/email-domain-card";
import { Mail } from "lucide-react";
import Link from "next/link";

export function EmailDomains() {
  const { slug, plan } = useWorkspace();

  const {
    emailDomains,
    loading: emailDomainsLoading,
    error: emailDomainsError,
  } = useEmailDomains();

  const { canManageEmailDomains } = getPlanCapabilities(plan);

  if (!canManageEmailDomains) {
    return (
      <div className="grid gap-5">
        <div className="animate-fade-in">
          <AnimatedEmptyState
            title="Connect email domains"
            description="Add email domains for branded partner communications. Available on Advanced plans and higher"
            cardContent={
              <>
                <Mail className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                  <ArrowTurnRight2 className="size-3.5" />
                </div>
              </>
            }
            addButton={
              <Link
                href={`/${slug}/upgrade`}
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "flex h-9 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                )}
              >
                Upgrade
              </Link>
            }
            learnMoreHref="https://dub.co/help/article/email-domains"
          />
        </div>
      </div>
    );
  }

  return emailDomainsLoading ? (
    <EmailDomainSkeleton />
  ) : emailDomainsError ? (
    <NoEmailDomains />
  ) : emailDomains && emailDomains.length > 0 ? (
    <EmailDomainsList domains={emailDomains || []} />
  ) : (
    <NoEmailDomains />
  );
}

const NoEmailDomains = () => {
  const { addEditEmailDomainModal, setIsOpen } = useAddEditEmailDomainModal({});

  return (
    <>
      {addEditEmailDomainModal}
      <div className="animate-fade-in">
        <AnimatedEmptyState
          title="No email domains"
          description="Add email domains for branded partner communications"
          cardContent={
            <>
              <Mail className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                <ArrowTurnRight2 className="size-3.5" />
              </div>
            </>
          }
          addButton={
            <Button
              variant="primary"
              text="Add domain"
              onClick={() => setIsOpen(true)}
              className="h-9 rounded-lg"
            />
          }
          learnMoreHref="https://dub.co/help/article/email-domains"
        />
      </div>
    </>
  );
};

const EmailDomainSkeleton = () => {
  return (
    <div className="grid gap-5">
      <div className="animate-fade-in space-y-3">
        {[...Array(1)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-10 shrink-0 animate-pulse rounded-full bg-neutral-200" />
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-40 animate-pulse rounded bg-neutral-200" />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-200" />
                <div className="size-8 animate-pulse rounded-lg bg-neutral-200" />
                <div className="size-8 animate-pulse rounded-lg bg-neutral-200" />
                <div className="size-8 animate-pulse rounded-lg bg-neutral-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmailDomainsList = ({ domains }: { domains: EmailDomainProps[] }) => {
  return (
    <div className="grid gap-5">
      <div className="animate-fade-in space-y-3">
        {domains.map((emailDomain) => (
          <EmailDomainCard key={emailDomain.id} domain={emailDomain} />
        ))}
      </div>
    </div>
  );
};
