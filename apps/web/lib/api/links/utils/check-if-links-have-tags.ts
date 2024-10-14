import { ProcessedLinkProps } from "../../../types";

export const checkIfLinksHaveTags = (links: ProcessedLinkProps[]) =>
  links.some(
    (link) => link.tagNames?.length || link.tagIds?.length || link.tagId,
  );
