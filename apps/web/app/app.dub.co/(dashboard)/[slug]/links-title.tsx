"use client";

/**
 * Renders the title for the links page ("Links"), or the folder switcher if the linkFolders feature flag is enabled
 * We can remove this component when removing the linkFolders feature flag
 */
export function LinksTitle() {
  // const { flags } = useWorkspace();
  //
  // return flags?.linkFolders ? <FolderSwitcher /> : <h1>My QR Codes</h1>;

  return <>My QR Codes</>;
}
