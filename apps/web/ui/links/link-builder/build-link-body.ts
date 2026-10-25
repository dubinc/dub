import { LinkFormData } from "./link-builder-provider";

export function buildLinkBody({ data }: { data: LinkFormData }) {
  // @ts-ignore – exclude extra attributes from `data` object before sending to API
  const { user, tags, tagId, folderId, ...rest } = data;

  return {
    ...rest,

    // Map tags to tagIds
    tagIds: tags.map(({ id }) => id),

    // Replace "unsorted" folder ID w/ null
    folderId: folderId === "unsorted" ? null : folderId,

    // Manually reset empty strings to null
    expiredUrl: rest.expiredUrl || null,
    ios: rest.ios || null,
    android: rest.android || null,
    externalId: rest.externalId || null,
    tenantId: rest.tenantId || null,
  };
}
