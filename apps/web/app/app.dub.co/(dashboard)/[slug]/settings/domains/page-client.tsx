"use client";

import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import NoDomainsPlaceholder from "@/ui/domains/no-domains-placeholder";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { Button } from "@dub/ui";
import { useState } from "react";

export default function WorkspaceDomainsClient() {
  const { id: workspaceId } = useWorkspace();

  const { AddEditDomainModal, AddDomainButton } = useAddEditDomainModal();
  const { activeWorkspaceDomains, archivedWorkspaceDomains } = useDomains();
  const [showArchivedDomains, setShowArchivedDomains] = useState(false);

  return (
    <>
      <div className="flex justify-between">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight text-black">
          Domains
        </h1>
        <AddDomainButton />
      </div>
      {workspaceId && <AddEditDomainModal />}
      <div>
        {activeWorkspaceDomains ? (
          activeWorkspaceDomains.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3">
              {activeWorkspaceDomains.map((domain) => (
                <li key={domain.slug}>
                  <DomainCard props={domain} />
                </li>
              ))}
            </ul>
          ) : (
            <NoDomainsPlaceholder AddDomainButton={AddDomainButton} />
          )
        ) : (
          <DomainCardPlaceholder />
        )}
        {archivedWorkspaceDomains && archivedWorkspaceDomains.length > 0 && (
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {showArchivedDomains &&
              archivedWorkspaceDomains?.map((domain) => (
                <li key={domain.slug}>
                  <DomainCard props={domain} />
                </li>
              ))}
            <Button
              text={`${showArchivedDomains ? "Hide" : "Show"} ${
                archivedWorkspaceDomains.length
              } archived domains`}
              variant="secondary"
              onClick={() => setShowArchivedDomains(!showArchivedDomains)}
            />
          </ul>
        )}
      </div>
    </>
  );
}
