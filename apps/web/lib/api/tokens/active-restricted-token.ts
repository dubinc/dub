export function activeRestrictedTokenWhere(now = new Date()) {
  return {
    OR: [
      {
        expires: null,
      },
      {
        expires: { gt: now },
      },
    ],
  };
}
