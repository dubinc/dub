"use client";

import useLink from "@/lib/swr/use-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkBuilderHeader } from "@/ui/links/link-builder/link-builder-header";
import { LinkBuilderProvider } from "@/ui/links/link-builder/link-builder-provider";

export function LinkPageClient({
  domain,
  slug,
}: {
  domain: string;
  slug: string;
}) {
  const workspace = useWorkspace();
  const { link } = useLink({
    domain,
    slug,
  });

  return link ? (
    <div>
      <LinkBuilderProvider props={link} workspace={workspace}>
        <LinkBuilderHeader foldersEnabled={!!workspace.flags?.linkFolders} />
      </LinkBuilderProvider>
    </div>
  ) : (
    <div>Loading...</div>
  );
}
