export const checkIfLinksHaveProgramPartners = (
  links: { programId?: string | null; partnerId?: string | null }[],
) => links.some((link) => link.programId || link.partnerId);
