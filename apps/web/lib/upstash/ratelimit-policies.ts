import { ratelimit } from "./ratelimit";

type RatelimitWindow = Parameters<typeof ratelimit>[1] & string;

export type RatelimitPolicy = {
  attempts: number;
  window: RatelimitWindow;
  keyPrefix: string;
  message?:
    | string
    | ((ctx: {
        retryAfter: string;
        attempts: number;
        window: string;
      }) => string);
};

export const RATELIMIT_POLICIES = {
  login: {
    attempts: 5,
    window: "1 m",
    keyPrefix: "rl:auth:login",
    message: "too-many-login-attempts", // exact error code matched by the sign-in page, must stay verbatim
  },

  loginLinkSend: {
    attempts: 2,
    window: "1 m",
    keyPrefix: "rl:auth:login-link:send",
  },

  signupOtpSend: {
    attempts: 2,
    window: "1 m",
    keyPrefix: "rl:auth:signup:otp:send",
  },

  accountExistsCheck: {
    attempts: 8,
    window: "1 m",
    keyPrefix: "rl:auth:account-exists:check",
  },

  passwordResetRequest: {
    attempts: 2,
    window: "1 m",
    keyPrefix: "rl:auth:password-reset:request",
  },

  passwordReset: {
    attempts: 2,
    window: "1 m",
    keyPrefix: "rl:auth:password-reset:confirm",
  },

  emailChangeRequest: {
    attempts: 3,
    window: "24 h",
    keyPrefix: "rl:auth:email-change",
  },

  // Keyed on the target email so many accounts can't spam the same address
  emailChangeRequestTarget: {
    attempts: 3,
    window: "24 h",
    keyPrefix: "rl:auth:email-change:target",
  },

  samlVerify: {
    attempts: 10,
    window: "1 m",
    keyPrefix: "rl:auth:saml-verify",
  },

  programImageUpload: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:program:application:image:upload",
  },

  messageAttachmentUpload: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:message:attachment:upload",
  },

  partnerProfileInvite: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:partner-profile:invite",
  },

  aiRewardGenerate: {
    attempts: 10,
    window: "1 m",
    keyPrefix: "rl:ai:reward:generate",
  },

  // Keyed on workspace + user so one actor cannot exhaust the workspace quota
  forwardDnsInstructions: {
    attempts: 10,
    window: "1 h",
    keyPrefix: "rl:domains:forward-dns-instructions",
  },

  // Keyed on the recipient so many accounts can't spam the same address
  forwardDnsInstructionsTarget: {
    attempts: 10,
    window: "1 h",
    keyPrefix: "rl:domains:forward-dns-instructions:target",
  },

  oauthAppReviewSubmit: {
    attempts: 1,
    window: "1 m",
    keyPrefix: "rl:oauth:app:review:submit",
    message:
      "Rate limit exceeded. Please try again later or contact support.",
  },

  verifyWorkspaceSetup: {
    attempts: 5,
    window: "1 m",
    keyPrefix: "rl:workspace:setup:verify",
    message:
      "Too many verification attempts. Please try again in a minute.",
  },

  createProgramApplication: {
    attempts: 3,
    window: "1 m",
    keyPrefix: "rl:program:application:create",
  },

  // Shared by start + verify so both count toward the same partner/platform budget
  socialAccountVerification: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:partner:social:verification",
    message: "Too many verification attempts. Please try again later.",
  },

  partnerUsernameUpdate: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:partner:profile:username-update",
    message:
      "You've updated your username too many times. Please try again later.",
  },

  domainTransfer: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:domains:transfer",
  },

  analyticsExport: {
    attempts: 1,
    window: "30 s",
    keyPrefix: "rl:analytics:export",
    message:
      "Analytics export is limited to once every 30 seconds. Please try again shortly.",
  },

  retryFailedPaypalPayout: {
    attempts: 1,
    window: "12 h",
    keyPrefix: "rl:partner:paypal:retry-failed-payout",
    message:
      "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
  },

  identityVerificationStart: {
    attempts: 1,
    window: "1 h",
    keyPrefix: "rl:partner:identity:verification:start",
    message: "Too many verification attempts. Please try again later.",
  },
} as const satisfies Record<string, RatelimitPolicy>;
