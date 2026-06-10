// Tracks emails signing in via admin impersonation links. Populated in
// CustomPrismaAdapter.useVerificationToken before the token is deleted.
const pendingAdminImpersonations = new Set<string>();

export const markAdminImpersonation = (email: string) => {
  pendingAdminImpersonations.add(email);
};

export const consumeAdminImpersonation = (email: string) => {
  const isAdminImpersonation = pendingAdminImpersonations.has(email);

  if (isAdminImpersonation) {
    pendingAdminImpersonations.delete(email);
  }

  return isAdminImpersonation;
};
