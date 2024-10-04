import { sha256 } from "js-sha256";
import { useMemo } from "react";

type User = {
  id?: string | null | undefined;
  email?: string | null | undefined;
  image?: string | null | undefined;
};

export function useUserAvatarUrl(user: User) {
  const url = useMemo(() => getUserAvatarUrl(user), [user]);
  return url;
}

export function getUserAvatarUrl(user?: User | null) {
  if (!user) return "https://api.dicebear.com/7.x/micah/svg";
  if (user.image) return user.image;

  // Gravatar default doesn't support SVG or query params, so we use PNG and encoded / params
  const dicebear = `https://api.dicebear.com/7.x/micah/png/${encodeURIComponent(`seed=${encodeURIComponent(user.email || user.id || "")}`)}`;

  return user.email
    ? `https://www.gravatar.com/avatar/${sha256(user.email)}?d=${encodeURIComponent(dicebear)}`
    : dicebear;
}
