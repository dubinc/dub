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

  passwordChange: {
    attempts: 5,
    window: "1 m",
    keyPrefix: "rl:auth:password-change",
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
} as const satisfies Record<string, RatelimitPolicy>;
