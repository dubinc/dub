import { LinkFormData } from "./link-builder-provider";

export function buildLinkBody({
  data,
  defaultProgramId,
}: {
  data: LinkFormData;
  defaultProgramId?: string | null;
}) {
  // @ts-ignore – exclude extra attributes from `data` object before sending to API
  const { user, tags, tagId, folderId, partnerId, ...rest } = data;

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

    // An omitted partnerId is ignored by PATCH (the route merges onto the
    // stored link). Removal has to send null, and programId has to be cleared
    // in the same request, otherwise the stored program reattaches the partner.
    ...(partnerId
      ? { programId: defaultProgramId, partnerId }
      : { programId: null, partnerId: null }),
  };
}
