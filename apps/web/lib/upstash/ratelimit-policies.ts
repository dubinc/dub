import { ratelimit } from "./ratelimit";

type RatelimitWindow = Parameters<typeof ratelimit>[1] & string;

export type RatelimitMessageContext = {
  retryAfter: string;
  attempts: number;
  window: string;
};

export type RatelimitPolicy = {
  attempts: number;
  window: RatelimitWindow;
  keyPrefix: string;
  message?: string | ((ctx: RatelimitMessageContext) => string);
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

  // Keyed on workspace + user so one member cannot exhaust the workspace upload budget
  workspaceFileUpload: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:workspace:file:upload",
    message: "Too many file uploads. Please try again later.",
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
    message: "Rate limit exceeded. Please try again later or contact support.",
  },

  verifyWorkspaceSetup: {
    attempts: 5,
    window: "1 m",
    keyPrefix: "rl:workspace:setup:verify",
    message: "Too many verification attempts. Please try again in a minute.",
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

  createToken: {
    attempts: 1,
    window: "5 s",
    keyPrefix: "rl:tokens:create",
  },

  workspaceInvite: {
    attempts: 1,
    window: "1 s",
    keyPrefix: "rl:workspace:invites",
    message:
      "You've reached the rate limit for inviting teammates. Please try again later after few seconds.",
  },

  slackSupportInviteWorkspace: {
    attempts: 5,
    window: "1 d",
    keyPrefix: "rl:slack-support-invite:workspace",
    message:
      "This workspace has reached the daily limit for Slack invite requests. Please try again tomorrow.",
  },

  // Keyed on workspace + user so one member cannot exhaust the workspace budget
  slackSupportInviteUser: {
    attempts: 10,
    window: "1 h",
    keyPrefix: "rl:slack-support-invite",
    message:
      "You've requested too many Slack invites recently. Please try again later.",
  },

  sitemapImport: {
    attempts: 5,
    window: "1 m",
    keyPrefix: "rl:sitemap-import",
    message:
      "Sitemap import was requested too recently. Please wait a minute and try again.",
  },

  // Anonymous (unauthenticated) link creation by IP
  anonymousLinkCreate: {
    attempts: 10,
    window: "1 d",
    keyPrefix: "rl:links:create:anonymous",
    message:
      "Rate limited – you can only create up to 10 links per day without an account.",
  },

  domainSearchAvailability: {
    attempts: 1,
    window: "5 s",
    keyPrefix: "rl:domains:search-availability",
    message: "Don't DDoS me pls 🥺",
  },
} as const satisfies Record<string, RatelimitPolicy>;
