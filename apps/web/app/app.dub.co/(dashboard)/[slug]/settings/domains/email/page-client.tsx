"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { ArrowTurnRight2, Button, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { Mail } from "lucide-react";
import Link from "next/link";

export function EmailDomains() {
  const { slug, plan } = useWorkspace();
  const { addEditEmailDomainModal, setIsOpen } = useAddEditEmailDomainModal({});

  const { canManageEmailDomains } = getPlanCapabilities(plan);

  if (!canManageEmailDomains) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      {addEditEmailDomainModal}
      <div className="grid gap-5">
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
      </div>
    </>
  );
}
