"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSwitcher } from "@/ui/folders/folder-switcher";

/**
 * Renders the title for the links page ("Links"), or the folder switcher if the linkFolders feature flag is enabled
 * We can remove this component when removing the linkFolders feature flag
 */
export function LinksTitle() {
  const { flags } = useWorkspace();

  return flags?.linkFolders ? <FolderSwitcher /> : <h1>Links</h1>;
}
