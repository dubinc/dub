"use client";

import useGroup from "@/lib/swr/use-group";
import { DefaultPartnerLink } from "@/lib/types";
import { MAX_DEFAULT_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { Button, Hyperlink } from "@dub/ui";
import { useDefaultPartnerLinkSheet } from "./add-edit-default-partner-link-sheet";
import { PartnerLinkPreview } from "./partner-link-preview";

export function GroupDefaultLinks() {
  const { group } = useGroup();

  const defaultLinks = group?.defaultLinks || [];
  const hasReachedMaxLinks = defaultLinks.length >= MAX_DEFAULT_PARTNER_LINKS;

  return (
    <div className="flex min-h-80 flex-col gap-6 rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Default partner links
          </h3>
          <p className="text-content-subtle text-sm font-normal leading-5">
            Links that are automatically created for each partner in this group
          </p>
        </div>

        <CreateDefaultLinkButton hasReachedMaxLinks={hasReachedMaxLinks} />
      </div>

      {defaultLinks.length > 0 ? (
        <div className="flex flex-col gap-4">
          {defaultLinks.map((link, index) => (
            <DefaultLinkPreview key={index} link={link} linkIndex={index} />
          ))}
        </div>
      ) : (
        <NoDefaultLinks />
      )}
    </div>
  );
}

function CreateDefaultLinkButton({
  hasReachedMaxLinks,
}: {
  hasReachedMaxLinks: boolean;
}) {
  const { DefaultPartnerLinkSheet, setIsOpen } = useDefaultPartnerLinkSheet({});

  return (
    <>
      <Button
        text="Create default link"
        variant="primary"
        className="h-8 w-fit rounded-lg px-3"
        onClick={() => setIsOpen(true)}
        disabled={hasReachedMaxLinks}
        disabledTooltip={
          hasReachedMaxLinks
            ? `You can only create up to ${MAX_DEFAULT_PARTNER_LINKS} default links.`
            : undefined
        }
      />
      {DefaultPartnerLinkSheet}
    </>
  );
}

function DefaultLinkPreview({
  link,
  linkIndex,
}: {
  link: DefaultPartnerLink;
  linkIndex: number;
}) {
  const { DefaultPartnerLinkSheet, setIsOpen } = useDefaultPartnerLinkSheet({
    linkIndex,
  });

  return (
    <>
      <div className="cursor-pointer" onClick={() => setIsOpen(true)}>
        <PartnerLinkPreview
          url={link.url}
          domain={link.domain}
          linkStructure={link.linkStructure}
          linkIndex={linkIndex}
        />
      </div>
      {DefaultPartnerLinkSheet}
    </>
  );
}

function NoDefaultLinks() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-6 rounded-lg bg-neutral-50 p-4">
      <Hyperlink className="size-6 text-neutral-800" />
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-base font-medium text-neutral-900">
          Default partner links
        </h2>
        <p className="text-sm font-normal text-neutral-600">
          No default partner links have been created yet
        </p>
      </div>
    </div>
  );
}
