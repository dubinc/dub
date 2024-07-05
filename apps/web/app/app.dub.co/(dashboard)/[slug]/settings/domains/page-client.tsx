"use client";

import useDefaultDomains from "@/lib/swr/use-default-domains";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import NoDomainsPlaceholder from "@/ui/domains/no-domains-placeholder";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { Button, Switch } from "@dub/ui";
import { DUB_DOMAINS } from "@dub/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
      <div className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-black">
          Default Domains
        </h2>
        <p className="mt-3 text-sm text-gray-500">
          Choose which default domains appear when creating a link in this
          workspace.
        </p>
      </div>
      <DefaultDomains />
    </>
  );
}

function DefaultDomains() {
  const { id } = useWorkspace();
  const { defaultDomains: initialDefaultDomains, mutate } = useDefaultDomains();
  const [defaultDomains, setDefaultDomains] = useState<string[]>([]);
  useEffect(() => {
    if (initialDefaultDomains) {
      setDefaultDomains(initialDefaultDomains);
    }
  }, [initialDefaultDomains]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mt-2 grid grid-cols-1 gap-3">
      {DUB_DOMAINS.map(({ slug }) => (
        <div
          key={slug}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
        >
          <DomainCardTitleColumn domain={slug} defaultDomain />
          <Switch
            disabled={submitting}
            checked={defaultDomains?.includes(slug)}
            fn={() => {
              const oldDefaultDomains = defaultDomains.slice();
              const newDefaultDomains = defaultDomains.includes(slug)
                ? defaultDomains.filter((d) => d !== slug)
                : [...defaultDomains, slug];

              setDefaultDomains(newDefaultDomains);
              setSubmitting(true);
              fetch(`/api/domains/default?workspaceId=${id}`, {
                method: "PUT",
                body: JSON.stringify({
                  defaultDomains: newDefaultDomains.filter((d) => d !== null),
                }),
              })
                .then(async (res) => {
                  if (res.ok) {
                    await mutate();
                  } else {
                    const error = await res.text();
                    toast.error(error);
                    setDefaultDomains(oldDefaultDomains);
                  }
                })
                .finally(() => setSubmitting(false));
            }}
          />
        </div>
      ))}
    </div>
  );
}
