"use client";

import useDefaultDomains from "@/lib/swr/use-default-domains";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import NoDomainsPlaceholder from "@/ui/domains/no-domains-placeholder";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import {
  Button,
  Checkbox,
  InfoTooltip,
  Label,
  MaxWidthWrapper,
  Popover,
  TooltipContent,
} from "@dub/ui";
import { DUB_DOMAINS } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkspaceDomainsClient() {
  const { id: workspaceId } = useWorkspace();

  const { AddEditDomainModal, AddDomainButton } = useAddEditDomainModal();
  const { activeWorkspaceDomains, archivedWorkspaceDomains } = useDomains();
  const [showArchivedDomains, setShowArchivedDomains] = useState(false);

  return (
    <>
      {workspaceId && <AddEditDomainModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                Domains
              </h1>
              <InfoTooltip
                content={
                  <TooltipContent
                    title="Learn more about how to add, configure, and verify custom domains on Dub."
                    href="https://dub.co/help/category/custom-domains"
                    target="_blank"
                    cta="Learn more"
                  />
                }
              />
            </div>
            <div className="flex">
              <AddDomainButton />
              <DefaultDomains />
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper className="py-10">
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
      </MaxWidthWrapper>
    </>
  );
}

const DefaultDomains = () => {
  const { id } = useWorkspace();
  const { defaultDomains: initialDefaultDomains, mutate } = useDefaultDomains();
  const [defaultDomains, setDefaultDomains] = useState<string[]>([]);
  useEffect(() => {
    if (initialDefaultDomains) {
      setDefaultDomains(initialDefaultDomains);
    }
  }, [initialDefaultDomains]);

  const [openPopover, setOpenPopover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Popover
      content={
        <form
          className="w-full p-2 md:w-52"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            fetch(`/api/domains/default?workspaceId=${id}`, {
              method: "PUT",
              body: JSON.stringify({ defaultDomains }),
            }).then(async (res) => {
              setSubmitting(false);
              if (res.ok) {
                await mutate();
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
        >
          <div className="p-2 text-xs text-gray-500">Default Domains</div>
          {DUB_DOMAINS.map(({ slug }) => (
            <div
              key={slug}
              className="flex items-center space-x-2 rounded-md bg-white transition-all hover:bg-gray-50 active:bg-gray-100"
            >
              <Checkbox
                type="submit"
                id={slug}
                value={slug}
                disabled={submitting}
                className="ml-3"
                checked={defaultDomains.includes(slug)}
                onClick={() =>
                  setDefaultDomains((prev) =>
                    prev.includes(slug)
                      ? prev.filter((d) => d !== slug)
                      : [...prev, slug],
                  )
                }
              />
              <Label htmlFor={slug} className="flex-1 cursor-pointer p-3 pl-0">
                {slug}
              </Label>
            </div>
          ))}
        </form>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="end"
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="group ml-2 flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white p-2.5 shadow transition-all duration-75"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 ${
            openPopover ? "rotate-180 text-gray-700" : "text-gray-400"
          } transition-all group-hover:text-gray-700`}
        />
      </button>
    </Popover>
  );
};
