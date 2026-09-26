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

  programImageUpload: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:program:application:image:upload",
    message:
      "You've reached the maximum number of attempts to upload images for this application. Please try again later.",
  },

  messageAttachmentUpload: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:message:attachment:upload",
    message: "Too many file uploads. Please try again later.",
  },

  bountySubmissionUpload: {
    attempts: 25,
    window: "24 h",
    keyPrefix: "bounty:submission:file:upload",
    message:
      "You've reached the maximum number of attempts to upload a file for this bounty.",
  },

  // Keyed on workspace + user so one member cannot exhaust the workspace upload budget
  workspaceFileUpload: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:workspace:file:upload",
    message: "Too many file uploads. Please try again later.",
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

  aiRewardTooltipReview: {
    attempts: 20,
    window: "1 m",
    keyPrefix: "rl:ai:reward:tooltip-review",
  },

  aiRewardTooltipScreen: {
    attempts: 60,
    window: "1 m",
    keyPrefix: "rl:ai:reward:tooltip-screen",
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

  // One reattribution per workspace per minute
  reattributeCustomer: {
    attempts: 1,
    window: "1 m",
    keyPrefix: "rl:customers:reattribute",
    message: ({ retryAfter }) =>
      `Customer reattribution is limited to once per minute because it updates analytics. Try again in ${retryAfter}.`,
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

  resumeUpload: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:resume:upload",
    message: "Too many resume uploads. Please try again later.",
  },

  // Keyed on partner + program so one partner cannot exhaust another's budget
  partnerAnalyticsExport: {
    attempts: 1,
    window: "30 s",
    keyPrefix: "rl:analytics:export:partner",
    message:
      "Analytics export is limited to once every 30 seconds. Please try again shortly.",
  },

  createToken: {
    attempts: 1,
    window: "5 s",
    keyPrefix: "rl:tokens:create",
  },

  submitLead: {
    attempts: 10,
    window: "1 m",
    keyPrefix: "rl:submitted-lead",
    message: "Too many leads submitted. Please try again later.",
  },

  trackApplication: {
    attempts: 10,
    window: "10 s",
    keyPrefix: "rl:track:application",
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

  tremendousSendOtp: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:tremendous:send-otp",
  },

  tremendousVerifyOtp: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:tremendous:verify-otp",
  },
} as const satisfies Record<string, RatelimitPolicy>;
