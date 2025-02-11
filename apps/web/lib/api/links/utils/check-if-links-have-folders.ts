import { ProcessedLinkProps } from "../../../types";

export const checkIfLinksHaveFolders = (links: ProcessedLinkProps[]) =>
  links.some((link) => link.folderId);
