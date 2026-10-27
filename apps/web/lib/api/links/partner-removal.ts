/**
 * Overrides applied when an update explicitly removes a link's partner.
 *
 * PATCH, upsert, and bulk update merge the body onto the stored link, so an
 * omitted `partnerId` keeps the current partner. An explicit `null` has to
 * clear `programId` too: `processLink` treats a stored program id plus
 * `tenantId` as "resolve the partner" and would put the same partner back.
 * A program id sent in the same request is left alone so `tenantId` can still
 * enroll a different partner.
 */
export function partnerRemovalOverrides(patch: {
  partnerId?: string | null;
  programId?: string | null;
}): { partnerId: null; programId: null } | Record<string, never> {
  if (patch.partnerId !== null || patch.programId) {
    return {};
  }

  return { partnerId: null, programId: null };
}
