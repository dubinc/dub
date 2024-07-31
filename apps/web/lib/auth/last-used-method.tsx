import { memo, useEffect, useState } from "react";

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

export const LastUsedAuthMethodTooltip = memo(() => {
  const [lastUsed, setLastUsed] = useState<AuthMethod | undefined>(undefined);

  useEffect(() => {
    setLastUsed(getLastUsedAuthMethod());
  }, []);

  if (!lastUsed) {
    return null;
  }

  const lastUsedText = lastUsed.charAt(0).toUpperCase() + lastUsed.slice(1);

  return (
    <div className="flex flex-col gap-3 py-2 text-center text-sm">
      <span className="text-gray-500">
        You signed in with {lastUsedText} last time.
      </span>
      <div className="relative flex items-center justify-center">
        <div className="border-subtle flex-grow border-t" />
        <span className="text-subtle mx-2 flex-shrink text-sm font-normal leading-none">
          Or continue with
        </span>
        <div className="border-subtle flex-grow border-t" />
      </div>
    </div>
  );
});
