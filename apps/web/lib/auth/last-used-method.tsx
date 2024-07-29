// Store the last used auth method in localStorage
const LAST_USED_AUTH_METHOD = "lastUsedAuthMethod";

export type AuthMethod = "google" | "github" | "email" | "saml" | "password";

export const setLastUsedAuthMethod = (method: AuthMethod) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(LAST_USED_AUTH_METHOD, method);
};

export const getLastUsedAuthMethod = () => {
  if (typeof window === "undefined") return;

  return localStorage.getItem(LAST_USED_AUTH_METHOD) as AuthMethod | undefined;
};

export const LastUsedAuthMethodTooltip = () => {
  return (
    <>
      <span className="absolute -left-20 top-1/2 -translate-y-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white">
        Last used
      </span>
    </>
  );
};
