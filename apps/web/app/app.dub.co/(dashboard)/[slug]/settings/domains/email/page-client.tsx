"use client";

import useEmailDomains from "@/lib/swr/use-email-domains";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CursorRays, Globe } from "@dub/ui";

export function EmailDomains() {
  const { emailDomains, loading } = useEmailDomains();

  const { AddEditDomainModal, AddDomainButton, setShowAddEditDomainModal } =
    useAddEditEmailDomainModal({
      buttonProps: {
        className: "h-9 rounded-lg",
      },
    });

  return (
    <>
      <AddEditDomainModal />
      <div className="grid gap-5">
        <div className="animate-fade-in">
          {!loading ? (
            emailDomains && emailDomains.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {emailDomains.map((domain) => (
                  <li key={domain.slug}>
                    {/* <DomainCard
                      props={{
                        ...domain,
                        primary: false,
                        archived: false,
                        // projectId: workspaceId,
                      }}
                    /> */}
                  </li>
                ))}
              </ul>
            ) : (
              <AnimatedEmptyState
                title="No email domains found"
                description="Add email domains for branded partner communications"
                cardContent={
                  <>
                    <Globe className="size-4 text-neutral-700" />
                    <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                    <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                      <CursorRays className="size-3.5" />
                    </div>
                  </>
                }
                addButton={<AddDomainButton />}
                learnMoreHref="https://dub.co/help/article/how-to-add-email-domain"
              />
            )
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {Array.from({ length: 2 }).map((_, idx) => (
                <li key={idx}>
                  <DomainCardPlaceholder />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
