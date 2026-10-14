import {
  ACCOUNT_NOT_LINKED_ERRORS,
  EMAIL_DOESNT_MATCH_ERROR,
  EMAIL_DOESNT_MATCH_MESSAGE,
} from "./account-linking";

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "no-credentials": "Please provide an email and password.",
  "invalid-credentials": "Email or password is incorrect.",
  "exceeded-login-attempts":
    "Account has been locked due to too many login attempts. Please contact support to unlock your account.",
  "too-many-login-attempts": "Too many login attempts. Please try again later.",
  "email-not-verified": "Please verify your email address.",
  "require-saml-sso":
    "Your organization requires authentication through your company's identity provider.",
  EmailSignin:
    "Failed to send login email. Please try again in a minute or contact support.",
  Callback:
    "We encountered an issue processing your request. Please try again or contact support if the problem persists.",
  OAuthSignin:
    "There was an issue signing you in. Please ensure your provider settings are correct.",
  OAuthCallback:
    "We faced a problem while processing the response from the OAuth provider. Please try again.",
  OAuthAccountNotLinked:
    "It looks like you already have an account with this email. Please sign in with your account email instead.",
  account_not_linked:
    "It looks like you already have an account with this email. Please sign in with your existing method, then connect this provider from Account → Security.",
  unable_to_link_account:
    "It looks like you already have an account with this email. Please sign in with your existing method, then connect this provider from Account → Security.",
  [EMAIL_DOESNT_MATCH_ERROR]: EMAIL_DOESNT_MATCH_MESSAGE,
  email_doesnt_match: EMAIL_DOESNT_MATCH_MESSAGE,
};

// Dedicated UI (e.g. AccountAlreadyExistsModal) handles these instead of a toast.
const AUTH_ERRORS_WITH_DEDICATED_UI = ACCOUNT_NOT_LINKED_ERRORS;

export function getAuthError({
  error,
  fallback = null,
}: {
  error: string | null | undefined;
  fallback?: string | null;
}) {
  if (!error || AUTH_ERRORS_WITH_DEDICATED_UI.has(error)) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[error] ?? fallback;
}
