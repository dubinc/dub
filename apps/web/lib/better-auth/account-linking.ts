import { programOAuthProviderIds } from "./program-oauth";

export const ACCOUNT_EXISTS_EMAIL_COOKIE = "dub.account_exists_email";

export const ACCOUNT_NOT_LINKED_ERRORS = new Set([
  "account_not_linked",
  "unable_to_link_account",
  "OAuthAccountNotLinked",
]);

export const EMAIL_DOESNT_MATCH_ERROR = "email_doesn't_match";

export const EMAIL_DOESNT_MATCH_MESSAGE =
  "This provider uses a different email than your Dub account. Sign in with the matching email, or connect a provider that uses the same address.";

export const AUTH_PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  saml: "SAML",
  credential: "Password",
  framer: "Framer",
  beehiiv: "Beehiiv",
};

export function getAuthProviderLabel(providerId: string) {
  return AUTH_PROVIDER_LABELS[providerId] ?? providerId;
}

// GitHub and program SSO must not silent-link on sign-in, even with a verified email.
export const UNTRUSTED_IMPLICIT_LINK_PROVIDERS = new Set([
  "github",
  ...programOAuthProviderIds,
]);

export function getOAuthErrorCallbackURL(provider: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("email");
  url.searchParams.set("provider", provider);
  return url.toString();
}
