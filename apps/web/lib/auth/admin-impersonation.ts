const pendingAdminImpersonations = new Set<string>();

export const markAdminImpersonation = (email: string) => {
  pendingAdminImpersonations.add(email.toLowerCase());
};

export const consumeAdminImpersonation = (email: string) => {
  const isAdminImpersonation = pendingAdminImpersonations.has(
    email.toLowerCase(),
  );

  if (isAdminImpersonation) {
    pendingAdminImpersonations.delete(email.toLowerCase());
  }

  return isAdminImpersonation;
};
